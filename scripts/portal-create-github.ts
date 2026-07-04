import { spawnSync } from "node:child_process";
import portal from "../portal.config";

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const repo = process.argv[2];
if (!repo) {
  console.error("Usage: pnpm portal:create-github <owner/repo>");
  process.exit(1);
}

const auth = spawnSync("gh", ["auth", "status"], { stdio: "ignore" });
if (auth.status !== 0) {
  console.error("GitHub CLI is not authenticated. Use the documented no-gh flow instead.");
  process.exit(1);
}

run("git", ["remote", "rename", "origin", "upstream"]);
run("gh", ["repo", "create", repo, "--public", "--source", ".", "--remote", "origin", "--push"]);
run("git", ["remote", "set-url", "upstream", portal.repositoryUrl]);

console.log(`Created ${repo} with origin=${repo} and upstream=${portal.repositoryUrl}.`);
