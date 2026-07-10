import fs from "node:fs/promises";
import path from "node:path";

import { fetchAppcastMetadata } from "./lib/appcast.mjs";
import {
  defaultPackageName,
  defaultReleaseRepo,
  getChannel,
  npmVersionFor,
  parseArgs,
  releaseTagForVersion
} from "./lib/config.mjs";
import { githubReleaseExists } from "./lib/github-release.mjs";
import { summarizeChannelReleaseState } from "./lib/release-state.mjs";

const args = parseArgs(process.argv.slice(2));
const packageName = String(args["package-name"] || defaultPackageName);
const releaseRepo = String(args["release-repo"] || defaultReleaseRepo);
const jsonOutputPath = args["json-output"]
  ? path.resolve(String(args["json-output"]))
  : null;
const force = String(args.force || "false") === "true";

const [prod, beta] = await Promise.all([
  resolveChannelState("prod"),
  resolveChannelState("beta")
]);

const summary = {
  packageName,
  force,
  channels: {
    prod,
    beta
  }
};

for (const channelState of [prod, beta]) {
  if (!channelState.outdated && !force) {
    console.log(
      `::warning::${channelState.channel} already published at ${channelState.packageVersion}; skipping unless force=true`
    );
  }
}

if (jsonOutputPath) {
  await fs.mkdir(path.dirname(jsonOutputPath), { recursive: true });
  await fs.writeFile(jsonOutputPath, `${JSON.stringify(summary, null, 2)}\n`);
}

console.log(JSON.stringify(summary, null, 2));

async function resolveChannelState(channelName) {
  const channel = getChannel(channelName);
  const upstream = await fetchAppcastMetadata(channel.appcastUrl);
  const packageVersion = npmVersionFor(channel.name, upstream);
  const publishedVersion = await lookupPublishedVersion(releaseRepo, packageVersion);

  return summarizeChannelReleaseState({
    channel,
    packageVersion,
    publishedVersion
  });
}

async function lookupPublishedVersion(releaseRepo, packageVersion) {
  return await githubReleaseExists({
    repo: releaseRepo,
    tag: releaseTagForVersion(packageVersion)
  }) ? packageVersion : null;
}
