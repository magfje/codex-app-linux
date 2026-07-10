import process from "node:process";

import { getChannel, parseArgs } from "./lib/config.mjs";

const args = parseArgs(process.argv.slice(2));
const channel = getChannel(String(args.channel || ""));
const packageVersion = String(args["package-version"] || "");

if (!channel.name) {
  throw new Error("--channel is required");
}

if (!packageVersion) {
  throw new Error("--package-version is required");
}

const lines = [
  `Automated personal Linux release for ${channel.name}.`,
  "",
  "## Arch Linux",
  "",
  channel.name === "prod"
    ? "The stable build is published through the `codex-personal` pacman repository."
    : "Beta builds are available as release assets; the personal pacman repository tracks stable only."
];

if (channel.name === "prod") {
  lines.push(
    "",
    "After the one-time repository setup:",
    "```bash",
    "sudo pacman -Syu codex-app-unofficial",
    "```"
  );
}

lines.push(
  "",
  "Version:",
  `- package: \`${packageVersion}\``
);

console.log(lines.join("\n"));
