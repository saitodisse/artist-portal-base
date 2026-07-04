import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const args = new Map<string, string>();
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  const value = process.argv[index + 1];
  if (!key?.startsWith("--") || !value) {
    continue;
  }
  args.set(key.slice(2), value);
}

const sourceId = args.get("source-id");
const publicName = args.get("name");
const siteUrl = args.get("site-url");
const repositoryUrl = args.get("repository-url");

if (!sourceId || !publicName) {
  console.error("Usage: pnpm portal:init --source-id <id> --name <name> [--site-url <url>] [--repository-url <url>]");
  process.exit(1);
}

const configPath = path.join(process.cwd(), "portal.config.ts");
let config = await readFile(configPath, "utf8");

config = config
  .replace(/sourceId: "demo-artist-portal"/, `sourceId: "${sourceId}"`)
  .replace(/name: "Demo Artist Portal"/, `name: "${publicName}"`)
  .replace(/publicName: "Demo Artist Portal"/, `publicName: "${publicName}"`);

if (siteUrl) {
  config = config.replace(/siteUrl: "[^"]*"/, `siteUrl: "${siteUrl}"`);
}

if (repositoryUrl) {
  config = config.replace(/repositoryUrl: "[^"]*"/, `repositoryUrl: "${repositoryUrl}"`);
}

await writeFile(configPath, config);
console.log(`Portal identity updated: ${sourceId} (${publicName}). Replace catalog/ demo content before publishing.`);
