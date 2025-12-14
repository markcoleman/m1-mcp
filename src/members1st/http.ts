import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { URL } from "node:url";
import { logApiRequest, logApiResponse } from "./logging.js";

export type HttpResult = {
  statusCode: number;
  statusMessage: string;
  headers: Record<string, string | string[] | undefined>;
  body: string;
};

/** Maximum number of HTTP redirects to follow */
const DEFAULT_MAX_REDIRECTS = 5;

/** Callback type for reloading headers on 401 */
export type ReloadHeadersCallback = () => Record<string, string>;

export async function httpGet(
  urlString: string, 
  headers: Record<string, string>, 
  maxRedirects = DEFAULT_MAX_REDIRECTS,
  reloadHeadersOnAuth?: ReloadHeadersCallback
): Promise<HttpResult> {
  let current = new URL(urlString);
  
  // Log the initial request
  logApiRequest("GET", urlString, headers);

  for (let redirects = 0; redirects <= maxRedirects; redirects++) {
    const res = await httpGetOnce(current, headers);

    const location = res.headers.location;
    const status = res.statusCode;
    const isRedirect = status === 301 || status === 302 || status === 303 || status === 307 || status === 308;

    if (isRedirect && location) {
      current = new URL(Array.isArray(location) ? location[0] : location, current);
      continue;
    }
    
    // Check for 401 Unauthorized and retry once with reloaded headers
    if (status === 401 && reloadHeadersOnAuth) {
      console.error(`[Members1st] Received 401 Unauthorized, reloading credentials and retrying...`);
      const newHeaders = reloadHeadersOnAuth();
      logApiRequest("GET", urlString, newHeaders);
      const retryRes = await httpGetOnce(new URL(urlString), newHeaders);
      logApiResponse(urlString, retryRes.statusCode, retryRes.statusMessage, retryRes.body);
      return retryRes;
    }
    
    // Log the response
    logApiResponse(urlString, res.statusCode, res.statusMessage, res.body);

    return res;
  }

  throw new Error(`Members1st accounts fetch failed: too many redirects (${maxRedirects})`);
}

function httpGetOnce(url: URL, headers: Record<string, string>): Promise<HttpResult> {
  const maxBytes = 5_000_000;
  const reqFn = url.protocol === "https:" ? httpsRequest : httpRequest;

  return new Promise((resolve, reject) => {
    const req = reqFn(
      url,
      {
        method: "GET",
        headers
      },
      (res) => {
        const chunks: Buffer[] = [];
        let bytes = 0;

        res.on("data", (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > maxBytes) {
            req.destroy(new Error("Response body too large"));
            return;
          }
          chunks.push(chunk);
        });

        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          resolve({
            statusCode: res.statusCode ?? 0,
            statusMessage: res.statusMessage ?? "",
            headers: res.headers as Record<string, string | string[] | undefined>,
            body
          });
        });

        res.on("error", reject);
      }
    );

    req.on("error", reject);
    req.end();
  });
}

export function parseJson(body: string | undefined): any {
  return JSON.parse(body || "null") as any;
}

export function extractArray(json: any, preferredKeys: string[]): any[] {
  if (Array.isArray(json)) return json;
  for (const key of preferredKeys) {
    if (Array.isArray(json?.[key])) return json[key];
  }
  return [];
}
