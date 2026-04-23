import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { stagePackagedResources } from "../scripts/lib/build.mjs";

test("stagePackagedResources preserves upstream resources except app.asar", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "codex-app-linux-build-test-"));
  const resourcesDir = path.join(root, "Resources");
  const targetDir = path.join(root, "staged");

  await fs.mkdir(path.join(resourcesDir, "plugins", "openai-bundled"), { recursive: true });
  await fs.mkdir(path.join(resourcesDir, "native"), { recursive: true });
  await fs.writeFile(path.join(resourcesDir, "app.asar"), "asar");
  await fs.writeFile(
    path.join(resourcesDir, "plugins", "openai-bundled", "marketplace.json"),
    '{"name":"openai-bundled"}\n'
  );
  await fs.writeFile(path.join(resourcesDir, "native", "browser-use-peer-authorization.node"), "native");
  await fs.writeFile(path.join(resourcesDir, "electron.icns"), "icon");

  await fs.mkdir(targetDir, { recursive: true });
  await stagePackagedResources(resourcesDir, targetDir);

  await assert.rejects(fs.access(path.join(targetDir, "app.asar")));
  assert.equal(
    await fs.readFile(path.join(targetDir, "plugins", "openai-bundled", "marketplace.json"), "utf8"),
    '{"name":"openai-bundled"}\n'
  );
  assert.equal(
    await fs.readFile(path.join(targetDir, "native", "browser-use-peer-authorization.node"), "utf8"),
    "native"
  );
  assert.equal(
    await fs.readFile(path.join(targetDir, "electron.icns"), "utf8"),
    "icon"
  );
});
