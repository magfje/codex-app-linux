import test from "node:test";
import assert from "node:assert/strict";

import { createRuntimePackageManifest } from "../scripts/lib/build.mjs";

test("createRuntimePackageManifest ships browser runtime on npm", () => {
  const manifest = createRuntimePackageManifest({
    channel: {
      name: "prod",
      displayName: "Codex",
      distTag: "latest"
    },
    packageName: "codex-app-linux",
    packageVersion: "26.313.41514-launcher.2",
    launcherCommand: "codex-app-linux",
    releaseRepo: "cau1k/codex-app-linux",
    releaseTag: "v26.313.41514-launcher.2",
    executableName: "codex-app-linux",
    unpackedTarballAssetName: "codex-app-linux-26.313.41514-launcher.2-x64-linux-unpacked.tar.gz",
    unpackedTarballSha256: "tarball-sha"
  });

  assert.equal(manifest.type, "module");
  assert.equal(manifest.bin["codex-app-linux"], "bin/codex-app-linux.mjs");
  assert.deepEqual(manifest.files, ["bin", "runtime", "README.md", "package.json"]);
  assert.equal(manifest.dependencies.ws, "^8.20.0");
  assert.equal(manifest.publishConfig.tag, "latest");
});
