import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";

import { MessageRouter } from "../runtime/webstrap/message-router.mjs";

function createLogger() {
  return {
    debug() {},
    info() {},
    warn() {},
    error() {}
  };
}

test("MessageRouter replies to failed MCP requests with mcp-response error", async () => {
  const appServer = new EventEmitter();
  appServer.sendRaw = async () => {
    throw new Error("app-server request timeout: account/read");
  };

  const router = new MessageRouter({
    appServer,
    udsClient: null,
    workerPath: null,
    logger: createLogger()
  });

  const sent = [];
  const ws = {
    readyState: 1,
    send(payload) {
      sent.push(JSON.parse(payload));
    }
  };

  await router._forwardToAppServer(ws, {
    id: "req-1",
    method: "account/read",
    params: {}
  });

  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0], {
    type: "main-message",
    payload: {
      hostId: "local",
      type: "mcp-response",
      message: {
        id: "req-1",
        result: null,
        error: {
          message: "app-server request timeout: account/read",
          code: -32000
        }
      }
    }
  });

  router.dispose();
});

test("MessageRouter ignores electron-only startup pings in web mode", async () => {
  const router = new MessageRouter({
    appServer: null,
    udsClient: null,
    workerPath: null,
    logger: createLogger()
  });

  const sent = [];
  const ws = {
    readyState: 1,
    send(payload) {
      sent.push(JSON.parse(payload));
    }
  };

  await router.handleEnvelope(ws, {
    type: "view-message",
    payload: {
      type: "hotkey-window-enabled-changed",
      enabled: true
    }
  });

  assert.deepEqual(sent, []);

  router.dispose();
});

test("MessageRouter returns Codex code theme defaults for configuration reads", async () => {
  const router = new MessageRouter({
    appServer: null,
    udsClient: null,
    workerPath: null,
    logger: createLogger()
  });

  const sent = [];
  const ws = {
    readyState: 1,
    send(payload) {
      sent.push(JSON.parse(payload));
    }
  };

  await router._handleVirtualFetch(ws, "req-1", {
    requestId: "req-1",
    method: "POST",
    url: "vscode://codex/get-configuration",
    body: JSON.stringify({ key: "appearanceDarkCodeThemeId" })
  });

  assert.equal(sent.length, 1);
  assert.equal(sent[0].payload.status, 200);
  assert.equal(JSON.parse(sent[0].payload.bodyJsonString).value, "codex");

  router.dispose();
});

test("MessageRouter answers experimental feature enablement writes locally", async () => {
  const appServer = new EventEmitter();
  appServer.sendRaw = async () => {
    throw new Error("should not reach app-server");
  };

  const router = new MessageRouter({
    appServer,
    udsClient: null,
    workerPath: null,
    logger: createLogger()
  });

  const sent = [];
  const ws = {
    readyState: 1,
    send(payload) {
      sent.push(JSON.parse(payload));
    }
  };

  await router._forwardToAppServer(ws, {
    id: "req-2",
    method: "experimentalFeature/enablement/set",
    params: {
      enablement: {
        tool_search: false
      }
    }
  });

  assert.deepEqual(sent[0], {
    type: "main-message",
    payload: {
      hostId: "local",
      type: "mcp-response",
      message: {
        id: "req-2",
        result: {
          enablement: {
            apps: true,
            plugins: true,
            tool_call_mcp_elicitation: true,
            tool_search: false,
            tool_suggest: false
          }
        },
        error: null
      }
    }
  });

  router.dispose();
});
