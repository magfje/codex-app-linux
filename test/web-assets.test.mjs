import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  patchStatsigChunkSource,
  readBuildMetadata,
  readExtractedBuildMetadata,
  resolveCodexAppPaths
} from "../runtime/webstrap/assets.mjs";

test("resolveCodexAppPaths supports linux-unpacked layout", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "codex-app-linux-web-assets-"));
  const appRoot = path.join(root, "linux-unpacked");
  const resourcesPath = path.join(appRoot, "resources");

  await fs.mkdir(resourcesPath, { recursive: true });
  await fs.writeFile(path.join(resourcesPath, "app.asar"), "");
  await fs.writeFile(path.join(resourcesPath, "codex"), "", { mode: 0o755 });

  const resolved = resolveCodexAppPaths(appRoot);

  assert.equal(resolved.appPath, appRoot);
  assert.equal(resolved.resourcesPath, resourcesPath);
  assert.equal(resolved.asarPath, path.join(resourcesPath, "app.asar"));
  assert.equal(resolved.codexCliPath, path.join(resourcesPath, "codex"));
});

test("readBuildMetadata supports linux package metadata without Info.plist", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "codex-app-linux-web-build-"));
  const appRoot = path.join(root, "linux-unpacked");
  const resourcesPath = path.join(appRoot, "resources");

  await fs.mkdir(resourcesPath, { recursive: true });
  await fs.writeFile(path.join(resourcesPath, "app.asar"), "");
  await fs.writeFile(
    path.join(resourcesPath, "app-package.json"),
    JSON.stringify({
      version: "26.313.41514",
      codexBuildNumber: "41514",
      codexBuildFlavor: "public-beta"
    })
  );

  const metadata = await readBuildMetadata({
    appPath: appRoot,
    resourcesPath,
    asarPath: path.join(resourcesPath, "app.asar"),
    packageMetadataPath: path.join(resourcesPath, "app-package.json")
  });

  assert.equal(metadata.shortVersion, "26.313.41514");
  assert.equal(metadata.bundleVersion, "41514");
  assert.equal(metadata.buildNumber, "41514");
  assert.equal(metadata.buildFlavor, "public-beta");
  assert.match(metadata.buildKey, /26\.313\.41514/);
});

test("readExtractedBuildMetadata reads version from extracted asar package", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "codex-app-linux-web-extract-"));
  await fs.writeFile(
    path.join(root, "package.json"),
    JSON.stringify({
      version: "26.325.21211",
      codexBuildNumber: "1251",
      codexBuildFlavor: "public-beta"
    })
  );

  const metadata = await readExtractedBuildMetadata(root, {
    shortVersion: "unknown",
    buildNumber: "unknown",
    buildFlavor: "prod"
  });

  assert.equal(metadata.shortVersion, "26.325.21211");
  assert.equal(metadata.buildNumber, "1251");
  assert.equal(metadata.buildFlavor, "public-beta");
  assert.match(metadata.buildKey, /26\.325\.21211-1251/);
});

test("patchStatsigChunkSource makes statsig init non-blocking", () => {
  const source =
    "function i(e,n){let i=(0,t.useMemo)(()=>(0,r._getInstance)(n.sdkKey)??e(n),[]),[a,o]=(0,t.useState)(i.loadingStatus!==`Ready`);return(0,t.useMemo)(()=>{i.loadingStatus!==`Ready`&&i.initializeAsync().catch(r.Log.error).finally(()=>o(!1))},[]),{client:i,isLoading:a}}";

  const patched = patchStatsigChunkSource(source);

  assert.match(patched, /\[a,o\]=\(0,t\.useState\)\(!1\)/);
  assert.doesNotMatch(patched, /i\.loadingStatus!==`Ready`\);return/);
});
