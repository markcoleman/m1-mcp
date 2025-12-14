import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { httpGet } from "./http.js";

describe("http 401 retry", () => {
  let server: Server | undefined;
  let serverUrl: string;
  let requestCount: number;
  let requestHeaders: Array<Record<string, string | string[] | undefined>>;

  beforeEach(async () => {
    requestCount = 0;
    requestHeaders = [];
    
    // Create a test server
    server = createServer((req, res) => {
      requestCount++;
      requestHeaders.push({ ...req.headers });

      // First request: return 401
      // Second request: return 200 if cookie changed
      if (requestCount === 1) {
        res.statusCode = 401;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ error: "Unauthorized" }));
      } else {
        res.statusCode = 200;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ success: true }));
      }
    });

    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    const address = server!.address();
    if (!address || typeof address === "string") throw new Error("Unexpected server address");
    serverUrl = `http://127.0.0.1:${address.port}/test`;
  });

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      server = undefined;
    }
  });

  it("retries request with reloaded headers on 401", async () => {
    let reloadCallCount = 0;
    const reloadHeadersOnAuth = () => {
      reloadCallCount++;
      return { "Cookie": `M1Online=newcookie${reloadCallCount}` };
    };

    const result = await httpGet(
      serverUrl,
      { "Cookie": "M1Online=oldcookie" },
      5,
      reloadHeadersOnAuth
    );

    // Should have made 2 requests (original + retry)
    assert.equal(requestCount, 2);
    // Should have called reload callback once
    assert.equal(reloadCallCount, 1);
    // Second request should succeed
    assert.equal(result.statusCode, 200);
    // First request had old cookie
    assert.equal(requestHeaders[0].cookie, "M1Online=oldcookie");
    // Second request had new cookie
    assert.equal(requestHeaders[1].cookie, "M1Online=newcookie1");
  });

  it("returns 401 if retry also fails", async () => {
    // Server that always returns 401
    const alwaysUnauthorizedServer = createServer((req, res) => {
      res.statusCode = 401;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: "Unauthorized" }));
    });

    await new Promise<void>((resolve) => alwaysUnauthorizedServer.listen(0, "127.0.0.1", resolve));
    const address = alwaysUnauthorizedServer.address();
    if (!address || typeof address === "string") throw new Error("Unexpected server address");
    const alwaysUnauthorizedUrl = `http://127.0.0.1:${address.port}/test`;

    try {
      let reloadCallCount = 0;
      const reloadHeadersOnAuth = () => {
        reloadCallCount++;
        return { "Cookie": `M1Online=newcookie${reloadCallCount}` };
      };

      const result = await httpGet(
        alwaysUnauthorizedUrl,
        { "Cookie": "M1Online=oldcookie" },
        5,
        reloadHeadersOnAuth
      );

      // Reload should have been called
      assert.equal(reloadCallCount, 1);
      // Should still return 401 response
      assert.equal(result.statusCode, 401);
    } finally {
      await new Promise<void>((resolve, reject) => {
        alwaysUnauthorizedServer.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  });

  it("does not retry if no reload callback provided", async () => {
    const result = await httpGet(
      serverUrl,
      { "Cookie": "M1Online=oldcookie" },
      5
      // No reloadHeadersOnAuth callback
    );

    // Should have made only 1 request
    assert.equal(requestCount, 1);
    // Should return 401 response
    assert.equal(result.statusCode, 401);
  });
});
