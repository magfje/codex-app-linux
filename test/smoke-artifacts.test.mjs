import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import {
  evaluateBundledCodexLauncherSource,
  evaluateBrowserClientNativePipeCompatibilitySource,
  evaluateDesktopBootResult,
  evaluateElectronFuseContract,
  evaluateLinuxDefaultFileManagerTargetSources,
  evaluateLinuxPrimaryWindowBackgroundThrottlingContractSources,
  evaluateLinuxWindowFocusableContractSources,
  hasDynamicToolSchemaCandidateSource
} from "../scripts/smoke-artifacts.mjs";

test("browser client smoke accepts the legacy node_repl native pipe fallback", () => {
  const source =
    "function vu(){let t=globalThis.nodeRepl?.nativePipe??import.meta.__codexNativePipe;return t}";

  assert.deepEqual(evaluateBrowserClientNativePipeCompatibilitySource(source), {
    legacyNodeReplFallback: true
  });
});

test("browser client smoke rejects clients without the legacy native pipe fallback", () => {
  assert.throws(
    () => evaluateBrowserClientNativePipeCompatibilitySource(
      "function vu(){let t=globalThis.nodeRepl?.nativePipe;return t}"
    ),
    /missing the legacy node_repl native pipe fallback/
  );
});

test("dynamic tool schema smoke requires nearby contract tokens", () => {
  const namespace = "description:`Tools provided by the Codex app.`";
  const mapper = ".map(e=>({...e,deferLoading:!0}))";

  assert.equal(hasDynamicToolSchemaCandidateSource(`${namespace}${mapper}`), true);
  assert.equal(
    hasDynamicToolSchemaCandidateSource(`${namespace}${"x".repeat(40_000)}${mapper}`),
    false
  );
});

test("desktop boot smoke accepts a silent process still alive at timeout", () => {
  assert.deepEqual(
    evaluateDesktopBootResult({
      code: null,
      timedOut: true,
      stdout: "",
      stderr: ""
    }),
    {
      exitCode: null,
      timedOut: true,
      bootSignal: "alive-timeout",
      inspectedWindows: false
    }
  );
});

test("desktop boot smoke still rejects fatal output", () => {
  assert.throws(
    () => evaluateDesktopBootResult({
      code: null,
      timedOut: true,
      stdout: "",
      stderr: "TypeError: Cannot read properties of undefined"
    }),
    /desktop binary printed fatal output/
  );
});

test("desktop boot smoke still rejects early failed exits", () => {
  assert.throws(
    () => evaluateDesktopBootResult({
      code: 1,
      timedOut: false,
      stdout: "",
      stderr: "failed before app ready"
    }),
    /desktop binary exited early/
  );
});

test("desktop boot smoke rejects native failed-start dialogs", () => {
  assert.throws(
    () => evaluateDesktopBootResult({
      code: null,
      timedOut: true,
      stdout: "",
      stderr: "",
      windowTree: '0x200001 "Codex (Beta) failed to start.": ("codex-app-linux-beta-bin" "Codex (Beta)")'
    }),
    /desktop binary showed startup failure dialog/
  );
});

test("desktop artifact smoke does not disable the Chromium sandbox", async () => {
  const source = await fs.readFile(
    new URL("../scripts/smoke-artifacts.mjs", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(source, /runCommand\(executablePath, \["--no-sandbox"\]/);
});

test("Electron fuse smoke requires hardened production defaults", () => {
  const disabled = "0".charCodeAt(0);
  const enabled = "1".charCodeAt(0);

  assert.deepEqual(
    evaluateElectronFuseContract({
      0: disabled,
      2: disabled,
      3: disabled,
      5: enabled,
      7: disabled
    }),
    { checked: 5 }
  );
  assert.throws(
    () => evaluateElectronFuseContract({
      0: enabled,
      2: disabled,
      3: disabled,
      5: enabled,
      7: disabled
    }),
    /RunAsNode must be disabled/
  );
});

test("Linux file manager smoke requires the packaged xdg-open target", () => {
  const source = "var __codexLinuxFileManager={id:`fileManager`,detect:()=>W(`xdg-open`)}";

  assert.deepEqual(
    evaluateLinuxDefaultFileManagerTargetSources([
      { file: ".vite/build/main.js", source }
    ]),
    { checked: 1, file: ".vite/build/main.js" }
  );
  assert.throws(
    () => evaluateLinuxDefaultFileManagerTargetSources([
      { file: ".vite/build/main.js", source: "var targets=[]" }
    ]),
    /missing the default xdg-open file manager target/
  );
});

test("bundled Codex launcher smoke rejects PATH-first wrappers", () => {
  assert.throws(
    () => evaluateBundledCodexLauncherSource(`#!/bin/sh
set -eu
candidate="$(command -v codex 2>/dev/null || true)"
bundled_codex="$script_dir/resources/codex"
export CODEX_CLI_PATH="$candidate"
`),
    /resolves PATH codex before bundled/
  );
});

test("bundled Codex launcher smoke accepts bundled-first wrappers", () => {
  assert.doesNotThrow(() => evaluateBundledCodexLauncherSource(`#!/bin/sh
set -eu
if [ -n "\${CODEX_CLI_PATH:-}" ]; then
  true
fi
bundled_codex="$script_dir/resources/codex"
candidate="$(command -v codex 2>/dev/null || true)"
export CODEX_CLI_PATH="$bundled_codex"
`));
});

test("Linux window focusable smoke reports unguarded BrowserWindow defaults", () => {
  const source = [
    "function createWindow(e={}){",
    "let{focusable:m}=e;",
    "new a.BrowserWindow({title:`Codex`,focusable:m})",
    "}"
  ].join("");

  assert.deepEqual(
    evaluateLinuxWindowFocusableContractSources([
      { file: ".vite/build/main.js", source }
    ]),
    {
      checked: 1,
      unsafe: [".vite/build/main.js"]
    }
  );
});

test("Linux window focusable smoke accepts patched and legacy-safe defaults", () => {
  const patched = [
    "function createWindow(e={}){",
    "let{focusable:m}=e;",
    "new a.BrowserWindow({title:`Codex`,focusable:m??!0})",
    "}"
  ].join("");
  const legacy = [
    "function createWindow(e={}){",
    "let{focusable:m}=e;",
    "new a.BrowserWindow({title:`Codex`,...(m==null?{}:{focusable:m})})",
    "}"
  ].join("");

  assert.deepEqual(
    evaluateLinuxWindowFocusableContractSources([
      { file: ".vite/build/main.js", source: patched },
      { file: ".vite/build/legacy.js", source: legacy },
      { file: ".vite/build/overlay.js", source: "new a.BrowserWindow({focusable:!1})" }
    ]),
    {
      checked: 2,
      unsafe: []
    }
  );
});

test("Linux primary window smoke rejects background-throttled queued work", () => {
  const source = [
    "function createWindow(e={}){",
    "let{focusable:m}=e,k={contextIsolation:!0};",
    "new a.BrowserWindow({title:`Codex`,focusable:m??!0,webPreferences:k})",
    "}"
  ].join("");

  assert.deepEqual(
    evaluateLinuxPrimaryWindowBackgroundThrottlingContractSources([
      { file: ".vite/build/main.js", source }
    ]),
    {
      checked: 1,
      unsafe: [".vite/build/main.js"]
    }
  );
});

test("Linux primary window smoke accepts unthrottled queued work", () => {
  const source = [
    "function createWindow(e={}){",
    "let{focusable:m}=e,k={contextIsolation:!0};",
    "new a.BrowserWindow({title:`Codex`,focusable:m??!0,webPreferences:process.platform===`linux`?{...k,backgroundThrottling:!1}:k})",
    "}"
  ].join("");

  assert.deepEqual(
    evaluateLinuxPrimaryWindowBackgroundThrottlingContractSources([
      { file: ".vite/build/main.js", source },
      { file: ".vite/build/overlay.js", source: "new a.BrowserWindow({webPreferences:{}})" }
    ]),
    {
      checked: 1,
      unsafe: []
    }
  );
});
