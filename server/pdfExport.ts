import PDFDocument from "pdfkit";
import type { Report } from "../drizzle/schema";

function parseList(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch { return []; }
}

export async function createReportPdf(report: Report): Promise<Buffer> {
  const document = new PDFDocument({ size: "A4", margin: 48, info: { Title: `${report.company || report.fileName} — FinBrief AI`, Author: "FinBrief AI" } });
  const chunks: Buffer[] = [];
  return new Promise((resolve) => {
    document.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.fillColor("#10483f").fontSize(24).font("Helvetica-Bold").text("FinBrief AI");
    document.fillColor("#587467").fontSize(9).font("Helvetica").text("AI-assisted financial report brief", { continued: false });
    document.moveDown(1.4);
    document.fillColor("#173e34").fontSize(20).font("Helvetica-Bold").text(report.company || report.fileName);
    document.fillColor("#6e8177").fontSize(10).font("Helvetica").text(report.period || "Latest reporting period");
    document.moveDown(1.2);
    document.fillColor("#244e42").fontSize(14).font("Helvetica-Bold").text(report.headline || "Executive readout");
    document.moveDown(.5);
    document.fillColor("#52675d").fontSize(10.5).font("Helvetica").text(report.summary || "No summary available.", { lineGap: 4 });
    const sections: Array<[string, string[]]> = [
      ["What stood out", parseList(report.highlights)],
      ["Risks to keep on the radar", parseList(report.risks)],
      ["Suggested follow-ups", parseList(report.actions)],
    ];
    for (const [title, items] of sections) {
      document.moveDown(1.1);
      document.fillColor("#10483f").fontSize(13).font("Helvetica-Bold").text(title);
      document.moveDown(.35);
      document.fillColor("#5f7368").fontSize(10).font("Helvetica");
      for (const item of items) document.text(`• ${item}`, { indent: 12, lineGap: 3 });
    }
    document.moveDown(1.2);
    document.fillColor("#8c9c93").fontSize(8).font("Helvetica").text(`Confidence: ${report.confidence ?? "—"}%  ·  Sentiment: ${report.sentiment || "—"}`);
    document.moveDown(.5);
    document.text("This brief is AI-assisted and is not investment advice.");
    document.end();
  });
}
