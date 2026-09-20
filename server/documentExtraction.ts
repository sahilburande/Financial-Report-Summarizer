import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export type ExtractionResult = {
  text: string;
  pages?: number;
  parser: "pdf-parse" | "mammoth" | "plain-text" | "none";
};

export async function extractTextFromBuffer(buffer: Buffer, mimeType: string, fileName: string): Promise<ExtractionResult> {
  const lowerName = fileName.toLowerCase();
  if (mimeType === "application/pdf" || lowerName.endsWith(".pdf")) {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return { text: result.text.trim(), pages: result.total, parser: "pdf-parse" };
    } finally {
      await parser.destroy();
    }
  }

  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || lowerName.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value.trim(), parser: "mammoth" };
  }

  if (mimeType.startsWith("text/") || /\.(csv|md|txt|log)$/i.test(lowerName)) {
    return { text: buffer.toString("utf8").trim(), parser: "plain-text" };
  }

  return { text: "", parser: "none" };
}
