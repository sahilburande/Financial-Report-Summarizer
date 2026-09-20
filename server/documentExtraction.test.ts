import { describe, expect, it } from "vitest";
import { extractTextFromBuffer } from "./documentExtraction";
import { createReportPdf } from "./pdfExport";

describe("document extraction and export", () => {
  it("extracts plain text from a text-based financial report", async () => {
    const result = await extractTextFromBuffer(Buffer.from("Revenue grew 18% year over year."), "text/plain", "sample.txt");
    expect(result.parser).toBe("plain-text");
    expect(result.text).toContain("Revenue grew 18%");
  });

  it("creates a valid PDF brief from a report record", async () => {
    const pdf = await createReportPdf({
      id: 7, userId: 0, fileKey: null, fileUrl: null, fileName: "sample.txt", mimeType: "text/plain", fileSize: 32,
      status: "completed", company: "Sample Holdings", period: "Q1 FY26", headline: "Growth is healthy.",
      summary: "Revenue and margin improved.", highlights: JSON.stringify(["Revenue grew"]), metrics: null,
      risks: JSON.stringify(["Watch working capital"]), actions: JSON.stringify(["Review cash conversion"]),
      sentiment: "Positive", confidence: 82, createdAt: new Date(), updatedAt: new Date(),
    });
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(500);
  });

  it("extracts text from a PDF buffer", async () => {
    const pdf = await createReportPdf({
      id: 8, userId: 0, fileKey: null, fileUrl: null, fileName: "sample.pdf", mimeType: "application/pdf", fileSize: 32,
      status: "completed", company: "PDF Holdings", period: "Q2 FY26", headline: "Margin expanded.",
      summary: "Operating margin expanded by 120 basis points.", highlights: JSON.stringify(["Revenue grew"]), metrics: null,
      risks: JSON.stringify(["Watch working capital"]), actions: JSON.stringify(["Review cash conversion"]),
      sentiment: "Positive", confidence: 82, createdAt: new Date(), updatedAt: new Date(),
    });
    const result = await extractTextFromBuffer(pdf, "application/pdf", "sample.pdf");
    expect(result.parser).toBe("pdf-parse");
    expect(result.text).toContain("Margin expanded");
  });
});
