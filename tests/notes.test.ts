import assert from "node:assert/strict";
import test from "node:test";
import { getNoteLineKind, insertNotePrefix, toggleChecklistLine } from "../src/features/garden/noteUtils.ts";

test("recognizes bullets and checklist lines", () => {
  assert.equal(getNoteLineKind("- Купить грунт"), "bullet");
  assert.equal(getNoteLineKind("[ ] Купить горшок"), "check-open");
  assert.equal(getNoteLineKind("[x] Купить горшок"), "check-done");
  assert.equal(getNoteLineKind("Обычная заметка"), "text");
});

test("toggles one checklist item without changing other note lines", () => {
  const source = "- Весенние дела\n[ ] Купить горшок\n[x] Купить грунт";
  assert.equal(toggleChecklistLine(source, 1), "- Весенние дела\n[x] Купить горшок\n[x] Купить грунт");
  assert.equal(toggleChecklistLine(source, 2), "- Весенние дела\n[ ] Купить горшок\n[ ] Купить грунт");
});

test("inserts a user-friendly list prefix on a new line", () => {
  assert.deepEqual(insertNotePrefix("Задачи", "[ ] "), { value: "Задачи\n[ ] ", cursor: 11 });
  assert.deepEqual(insertNotePrefix("", "- "), { value: "- ", cursor: 2 });
});
