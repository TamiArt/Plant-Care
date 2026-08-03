import assert from "node:assert/strict";
import test from "node:test";
import { answerWithOfflineKnowledge } from "../src/features/assistant/offlineKnowledge.ts";
import { askLocalAssistant } from "../src/features/assistant/localAssistant.ts";

test("always answers on Vercel-like environments without an AI API", async () => {
  const reply = await askLocalAssistant("Как поливать монстеру?", { name: "Монстера", wateringInterval: 7 });
  assert.match(reply, /7 дн/);
  assert.match(reply, /Монстера/);
});

test("routes common care questions through bundled offline knowledge", () => {
  assert.equal(answerWithOfflineKnowledge("Почему желтеют листья?").topic, "yellow-leaves");
  assert.equal(answerWithOfflineKnowledge("Когда пересадить в новый горшок?").topic, "repotting");
  assert.equal(answerWithOfflineKnowledge("На листьях появился клещ").topic, "pests");
  assert.equal(answerWithOfflineKnowledge("Как размножить черенком?").topic, "propagation");
});

test("uses a safety response instead of inventing toxicity advice", () => {
  const answer = answerWithOfflineKnowledge("Это токсично для кошки?", { name: "Неизвестный цветок" });
  assert.equal(answer.topic, "safety");
  assert.match(answer.text, /ветеринару/);
  assert.match(answer.text, /не буду определять токсичность/i);
});

test("offers supported topics for an unknown question", () => {
  const answer = answerWithOfflineKnowledge("Расскажи что-нибудь", { name: "Фикус" });
  assert.equal(answer.topic, "general");
  assert.match(answer.text, /бесплатно/);
  assert.match(answer.text, /Фикус/);
});
