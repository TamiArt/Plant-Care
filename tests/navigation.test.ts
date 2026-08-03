import assert from "node:assert/strict";
import test from "node:test";
import { APP_TABS, getInitialTab, isTab } from "../src/app/navigation.ts";

test("accepts every supported application tab", () => {
  for (const tab of APP_TABS) {
    assert.equal(isTab(tab), true);
    assert.equal(getInitialTab(`?screen=${tab}`), tab);
  }
});

test("falls back to home for missing or unsupported URL values", () => {
  assert.equal(getInitialTab(""), "home");
  assert.equal(getInitialTab("?screen=unknown"), "home");
  assert.equal(isTab(null), false);
});
