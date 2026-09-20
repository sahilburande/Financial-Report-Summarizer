import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import { extractTextFromBuffer } from "./documentExtraction";
import {
  addReportToCollection,
  createAlert,
  createCollection,
  createDelivery,
  createReport,
  getReportForUser,
  getReportsForUser,
  listAlerts,
  listCollectionReports,
  listCollections,
  listDeliveries,
  searchReportsForUser,
  toggleAlert,
  updateReport,
} from "./db";
import { createReportPdf } from "./pdfExport";
import { publicProcedure, router } from "./_core/trpc";

const summarySchema = {
  type: "object",
  properties: {
    company: { type: "string" },
    period: { type: "string" },
    headline: { type: "string" },
    summary: { type: "string" },
    highlights: { type: "array", items: { type: "string" } },
    metrics: { type: "array", items: { type: "object", properties: { label: { type: "string" }, value: { type: "string" }, change: { type: "string" }, tone: { type: "string", enum: ["positive", "negative", "neutral"] } }, required: ["label", "value", "change", "tone"], additionalProperties: false } },
    risks: { type: "array", items: { type: "string" } },
    actions: { type: "array", items: { type: "string" } },
    sentiment: { type: "string", enum: ["Positive", "Mixed", "Cautious"] },
    confidence: { type: "integer" },
  },
  required: ["company", "period", "headline", "summary", "highlights", "metrics", "risks", "actions", "sentiment", "confidence"],
  additionalProperties: false,
} as const;

type Summary = {
  company: string;
  period: string;
  headline: string;
  summary: string;
  highlights: string[];
  metrics: Array<{ label: string; value: string; change: string; tone: "positive" | "negative" | "neutral" }>;
  risks: string[];
  actions: string[];
  sentiment: "Positive" | "Mixed" | "Cautious";
  confidence: number;
};

function contentFromResponse(response: any) {
  const content = response?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => part?.text || "").join("");
  return "";
}

export function fallbackSummary(fileName: string): Summary {
  const company = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ").trim() || "Uploaded company";
  return {
    company,
    period: "Latest reporting period",
    headline: "Report uploaded — add more source text for a deeper analysis",
    summary: "FinBrief has received the document and created a review-ready placeholder. For the richest results, upload a text-based export or paste the report text so the analyst can extract financial context, drivers, and risks.",
    highlights: ["Document captured in your report library", "Analysis is ready to be enriched with source text", "No investment recommendation is generated"],
    metrics: [{ label: "Report type", value: "Financial report", change: "Uploaded", tone: "neutral" }, { label: "Coverage", value: "Pending", change: "Needs source text", tone: "neutral" }],
    risks: ["Source text was not available for automated extraction", "Validate all figures against the original filing"],
    actions: ["Upload a TXT, CSV, or Markdown export for full AI extraction", "Review the original filing before making decisions"],
    sentiment: "Mixed",
    confidence: 42,
  };
}

async function summarizeReport(fileName: string, mimeType: string, sourceText: string): Promise<Summary> {
  const prompt = `Analyze this financial report as a senior equity research associate. Return only JSON matching the provided schema. Extract the reporting company, period, performance drivers, key metrics, risks, and three practical follow-up questions. Be concise, use the source text only, and explicitly call out when a metric is not provided.\n\nFile: ${fileName}\nMIME type: ${mimeType}\n\nSOURCE TEXT:\n${sourceText.slice(0, 60000)}`;
  try {
    const response = await invokeLLM({ messages: [{ role: "system", content: "You create decision-ready financial report briefs for finance professionals. Do not give personalized investment advice." }, { role: "user", content: prompt }], response_format: { type: "json_schema", json_schema: { name: "financial_report_summary", strict: true, schema: summarySchema } } });
    return JSON.parse(contentFromResponse(response)) as Summary;
  } catch (error) {
    console.warn("[AI] Report summarization failed; using safe fallback", error);
    return fallbackSummary(fileName);
  }
}

function userIdFromContext(ctx: { user?: { id: number } | null }) { return ctx.user?.id ?? 0; }

export const reportRouter = router({
  list: publicProcedure.query(({ ctx }) => getReportsForUser(userIdFromContext(ctx))),
  search: publicProcedure.input(z.object({ query: z.string().max(255).default("") })).query(({ ctx, input }) => searchReportsForUser(userIdFromContext(ctx), input.query)),
  get: publicProcedure.input(z.object({ id: z.number().int().positive() })).query(({ ctx, input }) => getReportForUser(input.id, userIdFromContext(ctx))),

  summarize: publicProcedure.input(z.object({ fileName: z.string().min(1).max(255), mimeType: z.string().min(1).max(128), fileSize: z.number().int().nonnegative().max(20_000_000), fileData: z.string().max(28_000_000).optional().default(""), sourceText: z.string().max(100_000).optional().default("") })).mutation(async ({ ctx, input }) => {
    const userId = userIdFromContext(ctx);
    const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
    const key = `reports/${userId}/${Date.now()}-${safeName}`;
    const bytes = input.fileData ? Buffer.from(input.fileData.split(",").pop() || "", "base64") : Buffer.from(input.sourceText || "", "utf8");
    const stored = await storagePut(key, bytes, input.mimeType);
    const report = await createReport({ userId, fileKey: stored.key, fileUrl: stored.url, fileName: input.fileName, mimeType: input.mimeType, fileSize: input.fileSize, status: "processing" });
    let sourceText = input.sourceText;
    if (!sourceText && bytes.length > 0) {
      try { sourceText = (await extractTextFromBuffer(bytes, input.mimeType, input.fileName)).text; }
      catch (error) { console.warn("[Extract] Native document extraction failed", error); }
    }
    sourceText = sourceText || "The uploaded file is stored securely, but no extractable text was provided in this request.";
    const summary = await summarizeReport(input.fileName, input.mimeType, sourceText);
    return updateReport(report.id, { status: "completed", company: summary.company, period: summary.period, headline: summary.headline, summary: summary.summary, highlights: JSON.stringify(summary.highlights), metrics: JSON.stringify(summary.metrics), risks: JSON.stringify(summary.risks), actions: JSON.stringify(summary.actions), sentiment: summary.sentiment, confidence: Math.max(0, Math.min(100, summary.confidence)) });
  }),

  exportPdf: publicProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const report = await getReportForUser(input.id, userIdFromContext(ctx));
    if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
    const pdf = await createReportPdf(report);
    return { fileName: `${(report.company || report.fileName).replace(/[^a-zA-Z0-9_-]/g, "-")}-finbrief.pdf`, dataBase64: pdf.toString("base64") };
  }),

  deliver: publicProcedure.input(z.object({ reportId: z.number().int().positive(), channel: z.enum(["email", "slack"]), destination: z.string().min(1).max(320), message: z.string().max(4000).optional() })).mutation(async ({ ctx, input }) => {
    const report = await getReportForUser(input.reportId, userIdFromContext(ctx));
    if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
    await createDelivery({ userId: userIdFromContext(ctx), reportId: input.reportId, channel: input.channel, destination: input.destination, status: "simulated", message: input.message || report.summary || "FinBrief report brief" });
    return { status: "simulated" as const, channel: input.channel, destination: input.destination };
  }),

  collections: router({
    list: publicProcedure.query(({ ctx }) => listCollections(userIdFromContext(ctx))),
    create: publicProcedure.input(z.object({ name: z.string().min(1).max(120), description: z.string().max(255).optional(), color: z.string().max(32).optional() })).mutation(({ ctx, input }) => createCollection({ ...input, userId: userIdFromContext(ctx) })),
    reports: publicProcedure.input(z.object({ collectionId: z.number().int().positive() })).query(({ input }) => listCollectionReports(input.collectionId)),
    addReport: publicProcedure.input(z.object({ collectionId: z.number().int().positive(), reportId: z.number().int().positive() })).mutation(({ input }) => addReportToCollection(input.collectionId, input.reportId)),
  }),

  alerts: router({
    list: publicProcedure.query(({ ctx }) => listAlerts(userIdFromContext(ctx))),
    create: publicProcedure.input(z.object({ name: z.string().min(1).max(120), query: z.string().min(1).max(255), channel: z.enum(["in_app", "email", "slack"]), destination: z.string().max(320).optional(), frequency: z.enum(["instant", "daily", "weekly"]) })).mutation(({ ctx, input }) => createAlert({ ...input, userId: userIdFromContext(ctx) })),
    toggle: publicProcedure.input(z.object({ id: z.number().int().positive(), enabled: z.boolean() })).mutation(({ ctx, input }) => toggleAlert(input.id, userIdFromContext(ctx), input.enabled)),
  }),

  deliveries: publicProcedure.query(({ ctx }) => listDeliveries(userIdFromContext(ctx))),
});
