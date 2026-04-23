import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { stagePackagedResources } from "../scripts/lib/build.mjs";

test("stagePackagedResources preserves Linux-safe upstream resources", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "codex-app-linux-build-test-"));
  const resourcesDir = path.join(root, "Resources");
  const targetDir = path.join(root, "staged");

  await fs.mkdir(path.join(resourcesDir, "plugins", "openai-bundled", ".agents", "plugins"), { recursive: true });
  await fs.mkdir(path.join(resourcesDir, "plugins", "openai-bundled", "plugins", "browser-use"), { recursive: true });
  await fs.mkdir(path.join(resourcesDir, "plugins", "openai-bundled", "plugins", "computer-use"), { recursive: true });
  await fs.mkdir(path.join(resourcesDir, "plugins", "openai-bundled", "plugins", "latex-tectonic", "bin"), { recursive: true });
  await fs.mkdir(path.join(resourcesDir, "native"), { recursive: true });
  await fs.mkdir(path.join(resourcesDir, "app.asar.unpacked", "node_modules"), { recursive: true });
  await fs.writeFile(path.join(resourcesDir, "app.asar"), "asar");
  await fs.writeFile(
    path.join(resourcesDir, "app.asar.unpacked", "node_modules", "better_sqlite3.node"),
    "darwin-native"
  );
  await fs.writeFile(
    path.join(resourcesDir, "plugins", "openai-bundled", ".agents", "plugins", "marketplace.json"),
    JSON.stringify(
      {
        name: "openai-bundled",
        plugins: [
          { name: "browser-use", source: { source: "local", path: "./plugins/browser-use" } },
          { name: "computer-use", source: { source: "local", path: "./plugins/computer-use" } },
          { name: "latex-tectonic", source: { source: "local", path: "./plugins/latex-tectonic" } }
        ]
      },
      null,
      2
    ) + "\n"
  );
  await fs.writeFile(
    path.join(resourcesDir, "plugins", "openai-bundled", "plugins", "browser-use", "plugin.json"),
    "browser-use"
  );
  await fs.writeFile(
    path.join(resourcesDir, "plugins", "openai-bundled", "plugins", "computer-use", "plugin.json"),
    "computer-use"
  );
  await fs.writeFile(
    path.join(resourcesDir, "plugins", "openai-bundled", "plugins", "latex-tectonic", "bin", "tectonic"),
    "darwin-tectonic"
  );
  await fs.writeFile(path.join(resourcesDir, "codex"), "darwin-codex");
  await fs.writeFile(path.join(resourcesDir, "node"), "darwin-node");
  await fs.writeFile(path.join(resourcesDir, "rg"), "darwin-rg");
  await fs.writeFile(path.join(resourcesDir, "native", "browser-use-peer-authorization.node"), "native");
  await fs.writeFile(path.join(resourcesDir, "electron.icns"), "icon");

  await fs.mkdir(targetDir, { recursive: true });
  await stagePackagedResources(resourcesDir, targetDir);

  await assert.rejects(fs.access(path.join(targetDir, "app.asar")));
  await assert.rejects(fs.access(path.join(targetDir, "app.asar.unpacked")));
  await assert.rejects(fs.access(path.join(targetDir, "codex")));
  await assert.rejects(fs.access(path.join(targetDir, "node")));
  await assert.rejects(fs.access(path.join(targetDir, "rg")));
  await assert.rejects(fs.access(path.join(targetDir, "native")));
  await assert.rejects(fs.access(path.join(targetDir, "plugins", "openai-bundled", "plugins", "computer-use")));
  await assert.rejects(fs.access(path.join(targetDir, "plugins", "openai-bundled", "plugins", "latex-tectonic")));
  assert.equal(
    await fs.readFile(
      path.join(targetDir, "plugins", "openai-bundled", "plugins", "browser-use", "plugin.json"),
      "utf8"
    ),
    "browser-use"
  );
  const marketplace = JSON.parse(
    await fs.readFile(
      path.join(targetDir, "plugins", "openai-bundled", ".agents", "plugins", "marketplace.json"),
      "utf8"
    )
  );
  assert.deepEqual(
    marketplace.plugins.map(plugin => plugin.name),
    ["browser-use"]
  );
  assert.equal(
    await fs.readFile(path.join(targetDir, "electron.icns"), "utf8"),
    "icon"
  );
});
