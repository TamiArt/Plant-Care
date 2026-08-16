import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("logout clears every local garden store without deleting cloud data", () => {
  const repository = readFileSync(
    "src/features/garden/repository/gardenRepository.ts",
    "utf8",
  );
  const clearLocalGarden = repository.slice(
    repository.indexOf("export async function clearLocalGarden"),
    repository.indexOf("export async function getMetaValue"),
  );

  assert.match(clearLocalGarden, /"plants"/);
  assert.match(clearLocalGarden, /"photos"/);
  assert.match(clearLocalGarden, /"meta"/);
  assert.doesNotMatch(clearLocalGarden, /fetch|\/api\/|syncGarden/);
});

test("application signs out before clearing local garden state", () => {
  const source = readFileSync("src/app/App.tsx", "utf8");
  const logoutHandler = source.slice(
    source.indexOf("onLogout={async () =>"),
    source.indexOf("onImport={"),
  );

  const signOut = logoutHandler.indexOf("await auth.logout()");
  const clearGarden = logoutHandler.indexOf("await garden.clearGarden()");

  assert.ok(signOut > -1);
  assert.ok(clearGarden > signOut);
  assert.match(logoutHandler, /setTab\("home"\)/);
  assert.match(logoutHandler, /setDataSheetOpen\(false\)/);
});
