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
});
