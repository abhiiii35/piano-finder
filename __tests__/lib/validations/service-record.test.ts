import { describe, it, expect } from "vitest";
import { serviceRecordSchema } from "@/lib/validations/service-record";

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function tomorrowString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

describe("serviceRecordSchema", () => {
  const valid = { date: todayString() };

  it("accepts today's date but rejects a future date", () => {
    expect(serviceRecordSchema.safeParse({ date: todayString() }).success).toBe(true);
    expect(serviceRecordSchema.safeParse({ date: tomorrowString() }).success).toBe(false);
  });

  it("accepts humidity boundary values 0 and 100", () => {
    expect(serviceRecordSchema.safeParse({ ...valid, humidityPct: "0" }).success).toBe(true);
    expect(serviceRecordSchema.safeParse({ ...valid, humidityPct: "100" }).success).toBe(true);
  });

  it("rejects humidity just outside 0-100", () => {
    expect(serviceRecordSchema.safeParse({ ...valid, humidityPct: "-1" }).success).toBe(false);
    expect(serviceRecordSchema.safeParse({ ...valid, humidityPct: "101" }).success).toBe(false);
  });

  it("accepts pitch offset boundary values -200 and 200", () => {
    expect(serviceRecordSchema.safeParse({ ...valid, pitchOffsetCents: "-200" }).success).toBe(true);
    expect(serviceRecordSchema.safeParse({ ...valid, pitchOffsetCents: "200" }).success).toBe(true);
  });

  it("rejects pitch offset just outside -200..200", () => {
    expect(serviceRecordSchema.safeParse({ ...valid, pitchOffsetCents: "-201" }).success).toBe(false);
    expect(serviceRecordSchema.safeParse({ ...valid, pitchOffsetCents: "201" }).success).toBe(false);
  });

  it("accepts temperature boundary values 20 and 120", () => {
    expect(serviceRecordSchema.safeParse({ ...valid, temperatureF: "20" }).success).toBe(true);
    expect(serviceRecordSchema.safeParse({ ...valid, temperatureF: "120" }).success).toBe(true);
  });

  it("rejects temperature just outside 20-120", () => {
    expect(serviceRecordSchema.safeParse({ ...valid, temperatureF: "19" }).success).toBe(false);
    expect(serviceRecordSchema.safeParse({ ...valid, temperatureF: "121" }).success).toBe(false);
  });

  it("treats readings as optional (empty string = not provided)", () => {
    const result = serviceRecordSchema.safeParse({
      ...valid,
      humidityPct: "",
      pitchOffsetCents: "",
      temperatureF: "",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.humidityPct).toBeUndefined();
    expect(result.data.pitchOffsetCents).toBeUndefined();
    expect(result.data.temperatureF).toBeUndefined();
  });

  it("parses photosJson into a string array and defaults to empty", () => {
    expect(serviceRecordSchema.parse({ ...valid }).photosJson).toEqual([]);
    expect(
      serviceRecordSchema.parse({ ...valid, photosJson: JSON.stringify(["https://a", "https://b"]) })
        .photosJson
    ).toEqual(["https://a", "https://b"]);
  });

  it("treats an absent hideFromClient checkbox as false (visible by default)", () => {
    expect(serviceRecordSchema.parse({ ...valid }).hideFromClient).toBe(false);
    expect(serviceRecordSchema.parse({ ...valid, hideFromClient: "on" }).hideFromClient).toBe(true);
  });

  it("rejects a malformed date string", () => {
    expect(serviceRecordSchema.safeParse({ date: "not-a-date" }).success).toBe(false);
    expect(serviceRecordSchema.safeParse({ date: "2026-13-40" }).success).toBe(false);
  });
});
