import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isoDateOnly,
  parseIsoDateOnly,
  normalizeTransactionSearchOptions,
  daysBetween,
  chunkDateRange,
  toIsoDateOnly,
  DEFAULT_TRANSACTION_DAYS,
  MAX_TRANSACTION_DAYS
} from "./date-utils.js";

describe("date-utils", () => {
  describe("isoDateOnly", () => {
    it("returns YYYY-MM-DD format", () => {
      const date = new Date("2025-12-13T15:30:00.000Z");
      assert.equal(isoDateOnly(date), "2025-12-13");
    });

    it("handles dates at midnight UTC", () => {
      const date = new Date("2025-01-01T00:00:00.000Z");
      assert.equal(isoDateOnly(date), "2025-01-01");
    });

    it("handles dates at end of day", () => {
      const date = new Date("2025-12-31T23:59:59.999Z");
      assert.equal(isoDateOnly(date), "2025-12-31");
    });
  });

  describe("parseIsoDateOnly", () => {
    it("parses valid ISO date string", () => {
      const result = parseIsoDateOnly("2025-12-13");
      assert.ok(result instanceof Date);
      assert.equal(result?.toISOString().slice(0, 10), "2025-12-13");
    });

    it("returns undefined for invalid date string", () => {
      assert.equal(parseIsoDateOnly("not-a-date"), undefined);
    });

    it("returns undefined for empty string", () => {
      assert.equal(parseIsoDateOnly(""), undefined);
    });

    it("handles dates with time component", () => {
      const result = parseIsoDateOnly("2025-12-13T15:30:00Z");
      assert.ok(result instanceof Date);
    });
  });

  describe("normalizeTransactionSearchOptions", () => {
    it("uses provided startDate and endDate", () => {
      const result = normalizeTransactionSearchOptions({
        startDate: "2025-11-01",
        endDate: "2025-12-01"
      });
      assert.equal(result.startDate, "2025-11-01");
      assert.equal(result.endDate, "2025-12-01");
    });

    it("defaults endDate to today when not provided", () => {
      const today = isoDateOnly(new Date());
      const result = normalizeTransactionSearchOptions({
        startDate: "2025-11-01"
      });
      assert.equal(result.startDate, "2025-11-01");
      assert.equal(result.endDate, today);
    });

    it("defaults startDate to 30 days before endDate when not provided", () => {
      const result = normalizeTransactionSearchOptions({
        endDate: "2025-12-13"
      });
      assert.equal(result.startDate, "2025-11-13");
      assert.equal(result.endDate, "2025-12-13");
    });

    it("defaults both dates when neither provided", () => {
      const today = new Date();
      const expectedEnd = isoDateOnly(today);
      const expectedStart = new Date(today);
      expectedStart.setUTCDate(expectedStart.getUTCDate() - DEFAULT_TRANSACTION_DAYS);
      
      const result = normalizeTransactionSearchOptions({});
      
      assert.equal(result.endDate, expectedEnd);
      assert.equal(result.startDate, isoDateOnly(expectedStart));
    });
  });

  describe("daysBetween", () => {
    it("calculates days between two dates", () => {
      assert.equal(daysBetween("2025-12-01", "2025-12-31"), 30);
    });

    it("returns 0 for same date", () => {
      assert.equal(daysBetween("2025-12-13", "2025-12-13"), 0);
    });

    it("returns 0 when start is after end", () => {
      assert.equal(daysBetween("2025-12-31", "2025-12-01"), 0);
    });

    it("handles dates spanning months", () => {
      assert.equal(daysBetween("2025-11-15", "2025-12-15"), 30);
    });

    it("handles dates spanning years", () => {
      assert.equal(daysBetween("2024-12-31", "2025-01-01"), 1);
    });

    it("returns default for invalid start date", () => {
      assert.equal(daysBetween("invalid", "2025-12-13"), DEFAULT_TRANSACTION_DAYS);
    });

    it("returns default for invalid end date", () => {
      assert.equal(daysBetween("2025-12-13", "invalid"), DEFAULT_TRANSACTION_DAYS);
    });

    it("handles leap year correctly", () => {
      assert.equal(daysBetween("2024-02-01", "2024-03-01"), 29);
      assert.equal(daysBetween("2025-02-01", "2025-03-01"), 28);
    });

    it("calculates 180 days correctly", () => {
      assert.equal(daysBetween("2025-06-15", "2025-12-12"), 180);
    });

    it("calculates 365 days correctly", () => {
      assert.equal(daysBetween("2025-01-01", "2026-01-01"), 365);
    });
  });

  describe("chunkDateRange", () => {
    it("returns single chunk for range within MAX_TRANSACTION_DAYS", () => {
      const result = chunkDateRange("2025-12-01", "2025-12-13");
      assert.equal(result.length, 1);
      assert.equal(result[0].startDate, "2025-12-01");
      assert.equal(result[0].endDate, "2025-12-13");
    });

    it("returns single chunk for range exactly MAX_TRANSACTION_DAYS", () => {
      const result = chunkDateRange("2025-06-15", "2025-12-12");
      assert.equal(result.length, 1);
      assert.equal(result[0].startDate, "2025-06-15");
      assert.equal(result[0].endDate, "2025-12-12");
    });

    it("splits range longer than MAX_TRANSACTION_DAYS into multiple chunks", () => {
      // 365 days should be split into 3 chunks: 180 + 180 + 6
      const result = chunkDateRange("2025-01-01", "2026-01-01");
      assert.equal(result.length, 3);
      
      // First chunk: 180 days (inclusive, so 179 days difference)
      assert.equal(result[0].startDate, "2025-01-01");
      assert.equal(result[0].endDate, "2025-06-29");
      
      // Second chunk: 180 days
      assert.equal(result[1].startDate, "2025-06-30");
      assert.equal(result[1].endDate, "2025-12-26");
      
      // Third chunk: remaining days
      assert.equal(result[2].startDate, "2025-12-27");
      assert.equal(result[2].endDate, "2026-01-01");
    });

    it("chunks 200 days into 2 chunks", () => {
      const result = chunkDateRange("2025-05-27", "2025-12-13");
      assert.equal(result.length, 2);
      
      // First chunk should be 180 days
      assert.equal(result[0].startDate, "2025-05-27");
      assert.equal(daysBetween(result[0].startDate, result[0].endDate), 179);
      
      // Second chunk should be remaining days
      const lastChunk = result[result.length - 1];
      assert.equal(lastChunk.endDate, "2025-12-13");
    });

    it("handles invalid start date gracefully", () => {
      const result = chunkDateRange("invalid", "2025-12-13");
      assert.equal(result.length, 1);
      assert.equal(result[0].startDate, "invalid");
      assert.equal(result[0].endDate, "2025-12-13");
    });

    it("handles invalid end date gracefully", () => {
      const result = chunkDateRange("2025-12-13", "invalid");
      assert.equal(result.length, 1);
      assert.equal(result[0].startDate, "2025-12-13");
      assert.equal(result[0].endDate, "invalid");
    });

    it("ensures each chunk except last is exactly MAX_TRANSACTION_DAYS", () => {
      const result = chunkDateRange("2024-01-01", "2025-01-01");
      
      // Check all chunks except the last
      for (let i = 0; i < result.length - 1; i++) {
        const days = daysBetween(result[i].startDate, result[i].endDate);
        assert.equal(days, MAX_TRANSACTION_DAYS - 1);
      }
    });

    it("chunks are contiguous with no gaps", () => {
      const result = chunkDateRange("2024-01-01", "2025-01-01");
      
      for (let i = 0; i < result.length - 1; i++) {
        const currentEnd = parseIsoDateOnly(result[i].endDate);
        const nextStart = parseIsoDateOnly(result[i + 1].startDate);
        
        assert.ok(currentEnd);
        assert.ok(nextStart);
        
        // Next start should be one day after current end
        const expectedNext = new Date(currentEnd);
        expectedNext.setUTCDate(expectedNext.getUTCDate() + 1);
        
        assert.equal(isoDateOnly(expectedNext), isoDateOnly(nextStart));
      }
    });
  });

  describe("toIsoDateOnly", () => {
    it("converts Date object to ISO date string", () => {
      const date = new Date("2025-12-13T15:30:00.000Z");
      assert.equal(toIsoDateOnly(date), "2025-12-13");
    });

    it("parses and converts valid date string", () => {
      assert.equal(toIsoDateOnly("2025-12-13"), "2025-12-13");
    });

    it("parses and converts ISO datetime string", () => {
      const result = toIsoDateOnly("2025-12-13T15:30:00Z");
      assert.equal(result, "2025-12-13");
    });

    it("returns invalid string as-is when unparseable", () => {
      assert.equal(toIsoDateOnly("not-a-date"), "not-a-date");
    });

    it("defaults to today for non-date types", () => {
      const today = isoDateOnly(new Date());
      assert.equal(toIsoDateOnly(123), today);
      assert.equal(toIsoDateOnly(null), today);
      assert.equal(toIsoDateOnly(undefined), today);
    });

    it("handles invalid Date object", () => {
      const today = isoDateOnly(new Date());
      assert.equal(toIsoDateOnly(new Date("invalid")), today);
    });
  });
});
