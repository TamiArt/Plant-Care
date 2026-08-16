import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("garden header uses a clear account login icon", () => {
  const source = readFileSync(
    "src/features/garden/components/PlantsScreen.tsx",
    "utf8",
  );

  assert.match(source, /import \{ BookOpen, LogIn \} from "lucide-react"/);
  assert.match(source, /aria-label="Открыть вход и аккаунт"/);
  assert.match(source, /<LogIn size=\{18\}/);
  assert.doesNotMatch(source, /<Database/);
});
