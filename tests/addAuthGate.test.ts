import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("every plant creation entry point requires authentication", () => {
  const source = readFileSync("src/app/App.tsx", "utf8");

  assert.match(
    source,
    /nextTab === "add"[\s\S]*?!requireAuthForAdd\(\)/,
  );
  assert.match(
    source,
    /onAddToGarden=\{\(\) => \{[\s\S]*?!requireAuthForAdd\(\)/,
  );
  assert.match(
    source,
    /handleConfirmAdd[\s\S]*?!requireAuthForAdd\(\)/,
  );
  assert.match(
    source,
    /handleConfirmCustom[\s\S]*?!requireAuthForAdd\(\)/,
  );
});

test("unauthenticated add attempt explains how to continue", () => {
  const source = readFileSync("src/app/App.tsx", "utf8");

  assert.match(
    source,
    /Пожалуйста, войдите или зарегистрируйтесь, чтобы добавить растение/,
  );
  assert.match(source, /notice=\{authNotice\}/);
});
