import test from "node:test";
import assert from "node:assert/strict";

import { githubReleaseExists } from "../scripts/lib/github-release.mjs";

test("githubReleaseExists recognizes present and missing release tags", async () => {
  const requests = [];
  const present = await githubReleaseExists({
    repo: "magfje/codex-app-linux",
    tag: "v1.2.3",
    token: "token",
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return { ok: true, status: 200, statusText: "OK" };
    }
  });
  const missing = await githubReleaseExists({
    repo: "magfje/codex-app-linux",
    tag: "v9.9.9",
    fetchImpl: async () => ({ ok: false, status: 404, statusText: "Not Found" })
  });

  assert.equal(present, true);
  assert.equal(missing, false);
  assert.equal(
    requests[0].url,
    "https://api.github.com/repos/magfje/codex-app-linux/releases/tags/v1.2.3"
  );
  assert.equal(requests[0].options.headers.Authorization, "Bearer token");
});

test("githubReleaseExists reports GitHub API failures", async () => {
  await assert.rejects(
    githubReleaseExists({
      repo: "magfje/codex-app-linux",
      tag: "v1",
      fetchImpl: async () => ({ ok: false, status: 403, statusText: "rate limited" })
    }),
    /Failed to check GitHub release/
  );
});
