import { describe, it, expect } from "vitest";
import {
  autoGuessMapping,
  extractRow,
  looksLikeGazelleExport,
  GAZELLE_HEADERS,
} from "@/lib/import/mapping";

describe("autoGuessMapping", () => {
  it("maps Gazelle-style export headers to the right target fields", () => {
    const mapping = autoGuessMapping(GAZELLE_HEADERS);

    expect(mapping["First Name"]).toBe("customerName");
    expect(mapping["Last Name"]).toBe("customerName");
    expect(mapping["Email"]).toBe("customerEmail");
    expect(mapping["Phone"]).toBe("customerPhone");
    expect(mapping["Address"]).toBe("addressLine1");
    expect(mapping["City"]).toBe("city");
    expect(mapping["State"]).toBe("state");
    expect(mapping["Zip"]).toBe("zipCode");
    expect(mapping["Piano Make"]).toBe("pianoMake");
    expect(mapping["Piano Model"]).toBe("pianoModel");
    expect(mapping["Serial Number"]).toBe("pianoSerial");
    expect(mapping["Last Service"]).toBe("lastServiceDate");
  });

  it("is resilient to spacing/punctuation/case differences", () => {
    const mapping = autoGuessMapping(["  E-Mail Address ", "PHONE#", "zip_code"]);
    expect(mapping["  E-Mail Address "]).toBe("customerEmail");
    expect(mapping["PHONE#"]).toBe("customerPhone");
    expect(mapping["zip_code"]).toBe("zipCode");
  });

  it("leaves unrecognized headers unmapped", () => {
    const mapping = autoGuessMapping(["Favorite Color", "Internal ID"]);
    expect(mapping["Favorite Color"]).toBeNull();
    expect(mapping["Internal ID"]).toBeNull();
  });
});

describe("looksLikeGazelleExport", () => {
  it("detects a Gazelle-shaped header set", () => {
    expect(looksLikeGazelleExport(GAZELLE_HEADERS)).toBe(true);
  });

  it("rejects an unrelated header set", () => {
    expect(looksLikeGazelleExport(["Widget", "Cost", "Vendor"])).toBe(false);
  });
});

describe("extractRow", () => {
  it("combines two columns mapped to the same field (First + Last Name)", () => {
    const mapping = { "First Name": "customerName", "Last Name": "customerName" } as const;
    const row = extractRow({ "First Name": "Jane", "Last Name": "Doe" }, mapping);
    expect(row.customerName).toBe("Jane Doe");
  });

  it("skips unmapped and blank columns", () => {
    const mapping = { Name: "customerName", Notes: null } as const;
    const row = extractRow({ Name: "Jane Doe", Notes: "" }, mapping);
    expect(row).toEqual({ customerName: "Jane Doe" });
  });
});
