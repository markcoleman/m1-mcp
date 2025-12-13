import dotenv from "dotenv";

// Load .env into process.env (no-op if .env missing).
// Keep this side-effect isolated so entrypoints can import it once.
dotenv.config({ quiet: true });
