import { motion } from "motion/react";
import { Trash2 } from "lucide-react";

export function DeletePlantConfirm({ name, onConfirm, onClose }: { name: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center px-4 pb-10">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        className="relative w-full max-w-sm rounded-3xl bg-card p-6 shadow-2xl">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50"><Trash2 size={21} className="text-red-500" /></div>
        <h3 className="mb-2 text-center text-lg font-bold text-foreground">Удалить растение?</h3>
        <p className="mb-6 text-center text-sm leading-relaxed text-muted-foreground">
          «{name}» и вся история ухода, заметки и напоминания будут удалены. Это действие нельзя отменить.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-2xl border border-border py-3.5 text-sm font-medium">Отмена</button>
          <button onClick={onConfirm} className="flex-1 rounded-2xl bg-red-500 py-3.5 text-sm font-medium text-white">Удалить</button>
        </div>
      </motion.div>
    </div>
  );
}
