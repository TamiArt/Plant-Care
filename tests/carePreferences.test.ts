import assert from "node:assert/strict";
import test from "node:test";

import {
  formatSupplementalLight,
  isMistingEnabled,
  normalizeSupplementalLight,
} from "../src/features/garden/model/carePreferences.ts";

test(
  "misting remains enabled for legacy plants",
  () => {
    assert.equal(
      isMistingEnabled({}),
      true,
    );
  },
);

test(
  "explicitly disabled misting stays disabled",
  () => {
    assert.equal(
      isMistingEnabled({
        mistingEnabled: false,
      }),
      false,
    );
  },
);

test(
  "normalizes a valid supplemental light range",
  () => {
    assert.deepEqual(
      normalizeSupplementalLight({
        start: "12:00",
        end: "22:00",
      }),
      {
        start: "12:00",
        end: "22:00",
      },
    );
  },
);

test(
  "rejects malformed supplemental light values",
  () => {
    assert.equal(
      normalizeSupplementalLight({
        start: "25:00",
        end: "22:00",
      }),
      null,
    );

    assert.equal(
      normalizeSupplementalLight(null),
      null,
    );
  },
);

test(
  "formats supplemental light range for the card",
  () => {
    assert.equal(
      formatSupplementalLight({
        start: "12:00",
        end: "22:00",
      }),
      "12:00–22:00",
    );
  },
);
