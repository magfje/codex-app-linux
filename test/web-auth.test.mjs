import test from "node:test";
import assert from "node:assert/strict";

import { createAuthController, SessionStore } from "../runtime/webstrap/auth.mjs";
import { parseConfig } from "../runtime/webstrap/server.mjs";

test("parseConfig reads dangerously-disable-auth flag", () => {
  const enabled = parseConfig(["--dangerously-disable-auth", "true"], {});
  const disabled = parseConfig(["--dangerously-disable-auth", "false"], {});

  assert.equal(enabled.dangerouslyDisableAuth, true);
  assert.equal(disabled.dangerouslyDisableAuth, false);
});

test("parseConfig reads dangerously-disable-auth env", () => {
  const config = parseConfig([], {
    CODEX_APP_LINUX_WEB_DANGEROUSLY_DISABLE_AUTH: "1"
  });

  assert.equal(config.dangerouslyDisableAuth, true);
});

test("disabled auth controller authorizes all requests", () => {
  const auth = createAuthController({
    token: null,
    sessionStore: new SessionStore(),
    disabled: true
  });

  const res = {
    statusCode: null,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    endCalled: false,
    end() {
      this.endCalled = true;
    }
  };

  assert.equal(auth.isAuthorizedRequest({ headers: {} }), true);
  assert.equal(auth.requireAuth({ headers: {} }, res, new URL("http://127.0.0.1:8080/")), true);

  auth.handleAuthRoute({ headers: {} }, res, new URL("http://127.0.0.1:8080/__webstrapper/auth"));
  assert.equal(res.statusCode, 302);
  assert.equal(res.headers.location, "/");
  assert.equal(res.endCalled, true);
});
