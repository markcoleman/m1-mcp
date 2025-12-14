import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  sanitizeHeaderValue,
  buildCookieHeader,
  parseAdditionalHeaders,
  buildRequestHeaders,
  readCookieFromFile,
  getCookieValue
} from "./headers.js";

describe("headers", () => {
  describe("sanitizeHeaderValue", () => {
    it("removes newline characters", () => {
      assert.equal(sanitizeHeaderValue("value\nwith\nnewlines"), "value with newlines");
    });

    it("removes carriage return characters", () => {
      assert.equal(sanitizeHeaderValue("value\rwith\rreturns"), "value with returns");
    });

    it("removes CRLF sequences", () => {
      assert.equal(sanitizeHeaderValue("value\r\nwith\r\ncrlf"), "value with crlf");
    });

    it("trims whitespace", () => {
      assert.equal(sanitizeHeaderValue("  value  "), "value");
    });

    it("handles empty string", () => {
      assert.equal(sanitizeHeaderValue(""), "");
    });

    it("handles string with only whitespace", () => {
      assert.equal(sanitizeHeaderValue("   "), "");
    });

    it("preserves normal strings", () => {
      assert.equal(sanitizeHeaderValue("normal-header-value"), "normal-header-value");
    });
  });

  describe("buildCookieHeader", () => {
    it("wraps bare cookie value with M1Online=", () => {
      assert.equal(buildCookieHeader("abc123xyz"), "M1Online=abc123xyz");
    });

    it("preserves full cookie header with M1Online", () => {
      const cookie = "M1Online=abc123; Path=/";
      assert.equal(buildCookieHeader(cookie), cookie);
    });

    it("preserves full cookie header with m1online (case insensitive)", () => {
      const cookie = "m1online=abc123; Path=/";
      assert.equal(buildCookieHeader(cookie), cookie);
    });

    it("preserves cookie header with M1Online in middle", () => {
      const cookie = "other=value; M1Online=abc123; Path=/";
      assert.equal(buildCookieHeader(cookie), cookie);
    });

    it("preserves complete cookie string with multiple cookies", () => {
      const cookie = "session=xyz; token=abc";
      assert.equal(buildCookieHeader(cookie), cookie);
    });

    it("sanitizes header value before processing", () => {
      assert.equal(buildCookieHeader("abc\n123"), "M1Online=abc 123");
    });

    it("handles cookie value with equals sign", () => {
      const cookie = "M1Online=value=with=equals";
      assert.equal(buildCookieHeader(cookie), cookie);
    });
  });

  describe("parseAdditionalHeaders", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    it("returns empty object when MEMBERS1ST_HEADERS_JSON is not set", () => {
      delete process.env.MEMBERS1ST_HEADERS_JSON;
      assert.deepEqual(parseAdditionalHeaders(), {});
    });

    it("parses valid JSON object", () => {
      process.env.MEMBERS1ST_HEADERS_JSON = JSON.stringify({ "X-Custom": "value" });
      assert.deepEqual(parseAdditionalHeaders(), { "X-Custom": "value" });
    });

    it("sanitizes header values", () => {
      process.env.MEMBERS1ST_HEADERS_JSON = JSON.stringify({ "X-Custom": "value\nwith\nnewlines" });
      assert.deepEqual(parseAdditionalHeaders(), { "X-Custom": "value with newlines" });
    });

    it("returns empty object for invalid JSON", () => {
      process.env.MEMBERS1ST_HEADERS_JSON = "not-valid-json";
      assert.deepEqual(parseAdditionalHeaders(), {});
    });

    it("returns empty object for null", () => {
      process.env.MEMBERS1ST_HEADERS_JSON = "null";
      assert.deepEqual(parseAdditionalHeaders(), {});
    });

    it("returns empty object for array", () => {
      process.env.MEMBERS1ST_HEADERS_JSON = JSON.stringify(["header1", "header2"]);
      assert.deepEqual(parseAdditionalHeaders(), {});
    });

    it("filters out non-string values", () => {
      process.env.MEMBERS1ST_HEADERS_JSON = JSON.stringify({
        "X-String": "value",
        "X-Number": 123,
        "X-Boolean": true,
        "X-Null": null
      });
      assert.deepEqual(parseAdditionalHeaders(), { "X-String": "value" });
    });

    it("handles multiple valid headers", () => {
      process.env.MEMBERS1ST_HEADERS_JSON = JSON.stringify({
        "X-Header-1": "value1",
        "X-Header-2": "value2",
        "X-Header-3": "value3"
      });
      assert.deepEqual(parseAdditionalHeaders(), {
        "X-Header-1": "value1",
        "X-Header-2": "value2",
        "X-Header-3": "value3"
      });
    });
  });

  describe("readCookieFromFile", () => {
    const testDir = join("/tmp", "m1-mcp-test-cookies");

    beforeEach(() => {
      // Clean up test directory
      try {
        rmSync(testDir, { recursive: true, force: true });
      } catch {
        // Ignore errors
      }
      mkdirSync(testDir, { recursive: true });
    });

    it("reads cookie from file", () => {
      const cookieFile = join(testDir, "test.cookie");
      writeFileSync(cookieFile, "test-cookie-value");
      assert.equal(readCookieFromFile(cookieFile), "test-cookie-value");
    });

    it("trims whitespace from file content", () => {
      const cookieFile = join(testDir, "test-trim.cookie");
      writeFileSync(cookieFile, "  test-cookie-value  \n");
      assert.equal(readCookieFromFile(cookieFile), "test-cookie-value");
    });

    it("returns undefined for non-existent file", () => {
      assert.equal(readCookieFromFile(join(testDir, "nonexistent.cookie")), undefined);
    });

    it("resolves relative paths", () => {
      const cookieFile = join(testDir, "relative.cookie");
      writeFileSync(cookieFile, "relative-value");
      // Test that relative path resolution doesn't throw
      const result = readCookieFromFile(cookieFile);
      assert.equal(result, "relative-value");
    });
  });

  describe("getCookieValue", () => {
    const originalEnv = process.env;
    const testDir = join("/tmp", "m1-mcp-test-cookies");

    beforeEach(() => {
      process.env = { ...originalEnv };
      delete process.env.MEMBERS1ST_COOKIE;
      delete process.env.MEMBERS1ST_COOKIE_FILE;
      
      // Clean up test directory
      try {
        rmSync(testDir, { recursive: true, force: true });
      } catch {
        // Ignore errors
      }
      mkdirSync(testDir, { recursive: true });
    });

    it("returns cookie from MEMBERS1ST_COOKIE when set", () => {
      process.env.MEMBERS1ST_COOKIE = "direct-cookie";
      assert.equal(getCookieValue(), "direct-cookie");
    });

    it("returns cookie from file when MEMBERS1ST_COOKIE_FILE is set", () => {
      const cookieFile = join(testDir, "test.cookie");
      writeFileSync(cookieFile, "file-cookie");
      process.env.MEMBERS1ST_COOKIE_FILE = cookieFile;
      assert.equal(getCookieValue(), "file-cookie");
    });

    it("prefers MEMBERS1ST_COOKIE over MEMBERS1ST_COOKIE_FILE", () => {
      const cookieFile = join(testDir, "test.cookie");
      writeFileSync(cookieFile, "file-cookie");
      process.env.MEMBERS1ST_COOKIE = "direct-cookie";
      process.env.MEMBERS1ST_COOKIE_FILE = cookieFile;
      assert.equal(getCookieValue(), "direct-cookie");
    });

    it("returns undefined when neither is set", () => {
      assert.equal(getCookieValue(), undefined);
    });

    it("returns undefined when file does not exist", () => {
      process.env.MEMBERS1ST_COOKIE_FILE = join(testDir, "nonexistent.cookie");
      assert.equal(getCookieValue(), undefined);
    });
  });

  describe("buildRequestHeaders", () => {
    const originalEnv = process.env;
    const testDir = join("/tmp", "m1-mcp-test-cookies");

    beforeEach(() => {
      process.env = { ...originalEnv };
      delete process.env.MEMBERS1ST_COOKIE;
      delete process.env.MEMBERS1ST_COOKIE_FILE;
      delete process.env.MEMBERS1ST_AUTHORIZATION;
      delete process.env.MEMBERS1ST_HEADERS_JSON;
      
      // Clean up test directory
      try {
        rmSync(testDir, { recursive: true, force: true });
      } catch {
        // Ignore errors
      }
      mkdirSync(testDir, { recursive: true });
    });

    it("includes base headers", () => {
      const result = buildRequestHeaders({ "Content-Type": "application/json" });
      assert.equal(result["Content-Type"], "application/json");
    });

    it("adds cookie header when MEMBERS1ST_COOKIE is set", () => {
      process.env.MEMBERS1ST_COOKIE = "abc123";
      const result = buildRequestHeaders({});
      assert.equal(result.Cookie, "M1Online=abc123");
    });

    it("adds cookie header when MEMBERS1ST_COOKIE_FILE is set", () => {
      const cookieFile = join(testDir, "test.cookie");
      writeFileSync(cookieFile, "file-cookie-value");
      process.env.MEMBERS1ST_COOKIE_FILE = cookieFile;
      const result = buildRequestHeaders({});
      assert.equal(result.Cookie, "M1Online=file-cookie-value");
    });

    it("adds authorization header when MEMBERS1ST_AUTHORIZATION is set", () => {
      process.env.MEMBERS1ST_AUTHORIZATION = "Bearer token123";
      const result = buildRequestHeaders({});
      assert.equal(result.Authorization, "Bearer token123");
    });

    it("merges additional headers from MEMBERS1ST_HEADERS_JSON", () => {
      process.env.MEMBERS1ST_HEADERS_JSON = JSON.stringify({ "X-Custom": "value" });
      const result = buildRequestHeaders({ "Content-Type": "application/json" });
      assert.equal(result["Content-Type"], "application/json");
      assert.equal(result["X-Custom"], "value");
    });

    it("combines all header sources", () => {
      process.env.MEMBERS1ST_COOKIE = "cookie123";
      process.env.MEMBERS1ST_AUTHORIZATION = "Bearer token";
      process.env.MEMBERS1ST_HEADERS_JSON = JSON.stringify({ "X-Custom": "custom" });
      
      const result = buildRequestHeaders({ "Accept": "application/json" });
      
      assert.equal(result.Accept, "application/json");
      assert.equal(result.Cookie, "M1Online=cookie123");
      assert.equal(result.Authorization, "Bearer token");
      assert.equal(result["X-Custom"], "custom");
    });

    it("additional headers override base headers", () => {
      process.env.MEMBERS1ST_HEADERS_JSON = JSON.stringify({ "Accept": "text/html" });
      const result = buildRequestHeaders({ "Accept": "application/json" });
      assert.equal(result.Accept, "text/html");
    });
  });
});
