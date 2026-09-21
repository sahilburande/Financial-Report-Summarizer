import { describe, expect, it } from "vitest";
import { fallbackSummary } from "./reportRouter";

describe("fallbackSummary", () => {
  it("creates a safe review-ready brief from an uploaded filename", () => {
    const result = fallbackSummary("arcadia-energy-fy25.pdf");

    expect(result.company).toBe("arcadia energy fy25");
    expect(result.sentiment).toBe("Mixed");
    expect(result.confidence).toBeLessThan(50);
    expect(result.highlights.length).toBeGreaterThanOrEqual(3);
    expect(result.risks.join(" ")).toContain("Source text");
  });

  it("extracts structured metrics and sentiment from financial text", () => {
    const sampleText = `
Northstar Systems Q2 FY26 Shareholder Letter
Revenue was $2.84B, up +18.4% YoY driven by enterprise adoption.
Net income reached $642M (+23.1% YoY). Operating margin was 24.5%.
Free cash flow was $318M (-6.8% YoY).
Strong revenue growth and profit expansion across all core markets.
    `;
    const result = fallbackSummary("northstar-q2.pdf", sampleText);

    expect(result.company).toBe("northstar q2");
    expect(result.period).toContain("Q2 FY26");
    expect(result.sentiment).toBe("Positive");
    expect(result.confidence).toBeGreaterThanOrEqual(75);
    expect(result.metrics.length).toBeGreaterThanOrEqual(2);
  });
});
