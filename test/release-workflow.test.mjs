import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

test("release workflow publishes the stable build to the personal pacman repository", async () => {
  const workflow = await fs.readFile(".github/workflows/release.yml", "utf8");
  const prodJob = workflow.slice(
    workflow.indexOf("  publish-prod:"),
    workflow.indexOf("  publish-beta:")
  );
  const versionedRelease = prodJob.indexOf("Create or update GitHub release");
  const packageBuild = prodJob.indexOf("Build personal pacman package");
  const repositoryPublish = prodJob.indexOf("Publish personal pacman repository");

  assert.match(workflow, /CODEX_RELEASE_REPO: "\$\{\{ github\.repository \}\}"/);
  assert.match(prodJob, /repo-add codex-personal\.db\.tar\.gz/);
  assert.match(prodJob, /gh release upload pacman-repo/);
  assert.match(prodJob, /archlinux:base-devel/);
  assert.match(prodJob, /sudo chmod 4755 .*chrome-sandbox/);
  assert.ok(versionedRelease < packageBuild);
  assert.ok(packageBuild < repositoryPublish);
  assert.doesNotMatch(workflow, /npm publish|aur\.archlinux\.org|AUR_SSH_PRIVATE_KEY/);
});

test("release workflow runs canary and smoke before publish mutations", async () => {
  const workflow = await fs.readFile(".github/workflows/release.yml", "utf8");
  const canaryJob = workflow.indexOf("  canary:");
  const publishProd = workflow.indexOf("  publish-prod:");
  const publishBeta = workflow.indexOf("  publish-beta:");
  const prodSmoke = workflow.indexOf("Smoke channel", publishProd);
  const betaSmoke = workflow.indexOf("Smoke channel", publishBeta);
  const prodRelease = workflow.indexOf("Create or update GitHub release", publishProd);
  const betaRelease = workflow.indexOf("Create or update GitHub release", publishBeta);

  assert.ok(canaryJob > 0);
  assert.ok(canaryJob < publishProd);
  assert.ok(canaryJob < publishBeta);
  assert.match(workflow, /publish-prod:\n\s+needs: \[preflight, canary\]/);
  assert.match(workflow, /publish-beta:\n\s+needs: \[preflight, canary\]/);
  assert.ok(prodSmoke < prodRelease);
  assert.ok(betaSmoke < betaRelease);
});

test("upstream canary workflow reports scheduled failures without publish permissions", async () => {
  const workflow = await fs.readFile(".github/workflows/upstream-canary.yml", "utf8");
  const canaryJob = workflow.slice(
    workflow.indexOf("  upstream-canary:"),
    workflow.indexOf("  report-scheduled-failure:")
  );

  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /schedule:/);
  assert.match(workflow, /contents: read/);
  assert.doesNotMatch(canaryJob, /issues: write/);
  assert.doesNotMatch(workflow, /id-token: write/);
  assert.doesNotMatch(workflow, /npm publish|gh release upload|aur\.archlinux/);
  assert.match(workflow, /node scripts\/report-canary-failure\.mjs/);
  assert.match(workflow, /github\.event_name == 'schedule'/);
  assert.match(workflow, /No scheduled upstream canary failure to report/);
  assert.match(workflow, /needs\.upstream-canary\.result == 'failure'/);
});

test("release-channel CLI refuses direct publish bypass", async () => {
  await assert.rejects(
    execFileAsync(process.execPath, ["scripts/release-channel.mjs", "--channel", "prod", "--publish"]),
    error => {
      assert.match(error.stderr, /--publish is disabled/);
      return true;
    }
  );
});
