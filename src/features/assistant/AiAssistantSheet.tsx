import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bot, Loader2, Send, X } from "lucide-react";
import { askLocalAssistant, type AssistantContext } from "./localAssistant";

interface AiMessage { role: "user" | "assistant"; text: string }

export function AiAssistantSheet({ context, onClose }: { context?: AssistantContext; onClose: () => void }) {
  const subject = context?.name ?? "ваших растений";
  const [messages, setMessages] = useState<AiMessage[]>([
    { role: "assistant", text: `Привет! Я ваш ИИ-садовод 🌿 Задайте вопрос о ${subject}.` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages(previous => [...previous, { role: "user", text }]);
    setLoading(true);
    try {
      const reply = await askLocalAssistant(text, context);
      setMessages(previous => [...previous, { role: "assistant", text: reply }]);
    } catch {
      setMessages(previous => [...previous, { role: "assistant", text: "Ошибка при обращении к локальному ИИ." }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  bottomRef.current?.scrollIntoView({
    behavior: "smooth",
  });
}, [messages, loading]);

  const suggestions = ["Когда лучше пересаживать?", "Почему желтеют листья?", "Какое удобрение подходит?", "Как размножить?"];

  return <div className="fixed inset-0 z-50 flex flex-col">
    <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 280 }}
      className="relative mt-auto flex w-full max-w-md flex-col rounded-t-3xl bg-background mx-auto" style={{ maxHeight: "88vh" }}>
      <div className="flex justify-center pb-1 pt-3"><div className="h-1 w-10 rounded-full bg-border" /></div>
      <div className="flex items-center gap-2 border-b border-border px-5 pb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10"><Bot size={16} className="text-primary" /></div>
        <div><p className="text-sm font-semibold text-foreground">ИИ Садовод</p><p className="text-[11px] text-muted-foreground">{context?.name ?? "Бесплатный офлайн-помощник"}</p></div>
        <button onClick={onClose} aria-label="Закрыть ИИ-помощника" className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-muted"><X size={15} /></button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.map((message, index) => <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
          <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${message.role === "user" ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-secondary text-foreground"}`}>{message.text}</div>
        </div>)}
        {loading && <div className="flex justify-start"><div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-secondary px-3.5 py-2.5"><Loader2 size={14} className="animate-spin text-muted-foreground" /><span className="text-sm text-muted-foreground">Думаю...</span></div></div>}
        <div ref={bottomRef} />
      </div>

      <AnimatePresence>{messages.length === 1 && <motion.div className="scrollbar-hide flex flex-shrink-0 gap-2 overflow-x-auto px-4 py-2">
        {suggestions.map(suggestion => <button key={suggestion} onClick={() => setInput(suggestion)} className="flex-shrink-0 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-foreground">{suggestion}</button>)}
      </motion.div>}</AnimatePresence>

      <div className="flex flex-shrink-0 gap-2 border-t border-border px-4 pb-6 pt-2">
        <input value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => event.key === "Enter" && void send()}
          placeholder="Задайте вопрос о растении..." className="flex-1 rounded-2xl bg-muted px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground" />
        <button onClick={() => void send()} disabled={!input.trim() || loading} aria-label="Отправить вопрос"
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground disabled:opacity-40"><Send size={16} /></button>
      </div>
    </motion.div>
  </div>;
}
