import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("photo upload does not pretend to recognize a random plant", () => {
  const source = readFileSync("src/features/catalog/components/AddScreen.tsx", "utf8");

  assert.doesNotMatch(source, /Math\.random/);
  assert.doesNotMatch(source, /Растение определено/);
  assert.match(source, /Автоматическое распознавание не используется/);
});
