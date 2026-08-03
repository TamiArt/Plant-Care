import { answerWithOfflineKnowledge } from "./offlineKnowledge.ts";

export interface AssistantContext {
  name?: string;
  latinName?: string;
  wateringInterval?: number;
  description?: string;
}

function formatContext(context?: AssistantContext): string {
  if (!context?.name) return "Общий вопрос о растениях без выбранного растения.";
  return [
    context.name,
    context.latinName ? `(${context.latinName})` : "",
    context.wateringInterval ? `Полив каждые ${context.wateringInterval} дней.` : "",
    context.description ?? "",
  ].filter(Boolean).join(" ");
}

export async function askLocalAssistant(prompt: string, context?: AssistantContext): Promise<string> {
  const offlineAnswer = answerWithOfflineKnowledge(prompt, context);
  // Common care questions are answered immediately and consistently on every device.
  if (offlineAnswer.topic !== "general") return offlineAnswer.text;

  const fullPrompt = `Ты — опытный садовод и эксперт по уходу за растениями. Отвечай кратко и по делу на русском языке.\n\nКонтекст: ${formatContext(context)}\n\nВопрос: ${prompt}`;

  if (typeof window !== "undefined" && "ai" in window) {
    try {
      const ai = (window as unknown as { ai: { languageModel: { availability: () => Promise<string>; create: (options: object) => Promise<{ prompt: (value: string) => Promise<string> }> } } }).ai;
      const availability = await ai.languageModel.availability();
      if (availability === "readily" || availability === "downloadable") {
        const session = await ai.languageModel.create({ systemPrompt: "Ты эксперт-садовод. Отвечай кратко на русском." });
        return await session.prompt(fullPrompt);
      }
    } catch {
      // Continue with the free local fallback.
    }
  }

  if (typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 4_000);
    try {
      const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "llama3.2", prompt: fullPrompt, stream: false }),
        signal: controller.signal,
      });
      if (response.ok) {
        const data = await response.json() as { response?: string };
        if (data.response) return data.response;
      }
    } catch {
      // Ollama is optional; the bundled offline expert remains available.
    } finally {
      window.clearTimeout(timeout);
    }
  }

  return offlineAnswer.text;
}
