import "./env.js";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

import { createServer, IncomingMessage } from "node:http";
import { randomUUID } from "node:crypto";

import {
  ToolNames,
  handleGetAccountDetails,
  handleGetAccountTransactions,
  handleGetAllAccounts,
  schemas
} from "./tools.js";

const server = new Server(
  {
    name: "m1-mcp",
    version: "0.1.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: ToolNames.GetAllAccounts,
        description: "Get all accounts",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        }
      },
      {
        name: ToolNames.GetAccountDetails,
        description: "Get account details by accountId",
        inputSchema: {
          type: "object",
          properties: {
            accountId: { type: "string", description: "Account identifier" }
          },
          required: ["accountId"],
          additionalProperties: false
        }
      },
      {
        name: ToolNames.GetAccountTransactions,
        description: "Get transactions for an account by accountId",
        inputSchema: {
          type: "object",
          properties: {
            accountId: { type: "string", description: "Account identifier" },
            startDate: { type: "string", description: "YYYY-MM-DD" },
            endDate: { type: "string", description: "YYYY-MM-DD" },
            days: { type: "number", description: "Number of days of history (default 30)" },
            billpayOnly: { type: "boolean", description: "Filter to billpay transactions only" },
            advanced: { type: "boolean", description: "Enable advanced search (Members1st)" },
            actionCode: { type: "string", description: "Action code filter (Members1st), e.g. *" },
            sourceCode: { type: "string", description: "Source code filter (Members1st), e.g. *" }
          },
          required: ["accountId"],
          additionalProperties: false
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === ToolNames.GetAllAccounts) {
    const result = await handleGetAllAccounts();
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
    };
  }

  if (name === ToolNames.GetAccountDetails) {
    const parsed = schemas.getAccountDetails.safeParse(args ?? {});
    if (!parsed.success) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { error: { code: "INVALID_ARGUMENTS", issues: parsed.error.issues } },
              null,
              2
            )
          }
        ]
      };
    }

    const result = await handleGetAccountDetails(parsed.data.accountId);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
    };
  }

  if (name === ToolNames.GetAccountTransactions) {
    const parsed = schemas.getAccountTransactions.safeParse(args ?? {});
    if (!parsed.success) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { error: { code: "INVALID_ARGUMENTS", issues: parsed.error.issues } },
              null,
              2
            )
          }
        ]
      };
    }

    const { accountId, ...opts } = parsed.data;
    const result = await handleGetAccountTransactions(accountId, opts);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
    };
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ error: { code: "UNKNOWN_TOOL", name } }, null, 2)
      }
    ]
  };
});

async function main() {
  const transportKind = (process.env.MCP_TRANSPORT ?? "stdio").toLowerCase();

  if (transportKind === "http") {
    const host = process.env.HOST ?? "127.0.0.1";
    const port = Number(process.env.PORT ?? "3000");
    const mcpPath = process.env.MCP_PATH ?? "/mcp";
    const enableJsonResponse = (process.env.MCP_ENABLE_JSON_RESPONSE ?? "").toLowerCase() === "true" ||
      process.env.MCP_ENABLE_JSON_RESPONSE === "1";
    const stateless = (process.env.MCP_STATELESS ?? "").toLowerCase() === "true" ||
      process.env.MCP_STATELESS === "1";

    if (!Number.isFinite(port) || port <= 0) {
      throw new Error(`Invalid PORT: ${process.env.PORT}`);
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: stateless ? undefined : () => randomUUID(),
      enableJsonResponse
    });

    await server.connect(transport);

    const httpServer = createServer(async (req, res) => {
      try {
        const url = new URL(req.url ?? "/", `http://${req.headers.host ?? host}`);
        if (url.pathname !== mcpPath) {
          res.statusCode = 404;
          res.end();
          return;
        }

        if (req.method === "POST") {
          const body = await readJsonBody(req);
          await transport.handleRequest(req, res, body);
          return;
        }

        await transport.handleRequest(req, res);
      } catch (err) {
        res.statusCode = 500;
        res.setHeader("content-type", "application/json; charset=utf-8");
        res.end(
          JSON.stringify(
            { error: { code: "INTERNAL", message: err instanceof Error ? err.message : String(err) } },
            null,
            2
          )
        );
      }
    });

    await new Promise<void>((resolve) => {
      httpServer.listen(port, host, resolve);
    });

    const shutdown = () => {
      httpServer.close(() => process.exit(0));
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    // eslint-disable-next-line no-console
    console.error(`MCP HTTP server listening on http://${host}:${port}${mcpPath}`);
    return;
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const maxBytes = 1_000_000;

  return new Promise((resolve, reject) => {
    let bytes = 0;
    let data = "";

    req.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > maxBytes) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      data += chunk.toString("utf8");
    });

    req.on("end", () => {
      if (!data) {
        resolve(undefined);
        return;
      }

      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(new Error("Invalid JSON body"));
      }
    });

    req.on("error", reject);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Server failed to start:", err);
  process.exit(1);
});
