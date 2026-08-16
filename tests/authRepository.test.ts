import assert from "node:assert/strict";
import test from "node:test";
import { getAuthErrorMessage } from "../src/features/auth/authErrors.ts";

test("explains invalid credentials without exposing a server-only message", () => {
  assert.match(
    getAuthErrorMessage({ code: "INVALID_EMAIL_OR_PASSWORD" }, "fallback"),
    /Неверная почта или пароль/,
  );
});

test("identifies an origin configuration failure", () => {
  assert.match(
    getAuthErrorMessage({ code: "INVALID_ORIGIN", status: 403 }, "fallback"),
    /адрес приложения/i,
  );
});

test("turns server and rate-limit statuses into actionable messages", () => {
  assert.match(getAuthErrorMessage({ status: 500 }, "fallback"), /временно не отвечает/);
  assert.match(getAuthErrorMessage({ status: 429 }, "fallback"), /Подождите/);
});

test("preserves a useful unknown API message and otherwise uses fallback", () => {
  assert.equal(getAuthErrorMessage({ message: "Useful detail" }, "fallback"), "Useful detail");
  assert.equal(getAuthErrorMessage(undefined, "fallback"), "fallback");
});
