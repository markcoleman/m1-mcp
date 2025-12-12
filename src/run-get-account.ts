import { handleGetAccountDetails } from "./tools.js";

function parseAccountId(argv: string[]): string | undefined {
  const args = argv.slice(2);
  if (args.length === 0) return undefined;

  const flagIndex = args.findIndex((a) => a === "--accountId" || a === "--account" || a === "-a");
  if (flagIndex !== -1) {
    return args[flagIndex + 1];
  }

  // Default: first positional arg
  return args[0];
}

async function main() {
  const accountId = parseAccountId(process.argv);
  if (!accountId) {
    console.error("Usage: npm run get:account -- <accountId>\n       npm run get:account -- --accountId <accountId>");
    process.exitCode = 2;
    return;
  }

  const result = await handleGetAccountDetails(accountId);
  console.log(JSON.stringify(result, null, 2));

  // Exit non-zero if the tool returned a structured error.
  if (typeof (result as any)?.error?.code === "string") {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
