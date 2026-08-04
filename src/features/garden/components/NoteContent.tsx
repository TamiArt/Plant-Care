import { CheckSquare, Square } from "lucide-react";
import { getNoteLineKind } from "../noteUtils";

export function NoteContent({ content, onToggleChecklist }: { content: string; onToggleChecklist: (lineIndex: number) => void }) {
  const lines = content.split("\n");
  return (
    <div className="text-sm text-foreground space-y-0.5 leading-relaxed">
      {lines.map((line, i) => {
        const kind = getNoteLineKind(line);
        if (kind === "check-done") return (
          <button type="button" key={i} onClick={() => onToggleChecklist(i)} className="flex w-full items-start gap-2 text-left">
            <CheckSquare size={13} className="text-primary mt-0.5 flex-shrink-0" />
            <span className="line-through text-muted-foreground">{line.slice(4)}</span>
          </button>
        );
        if (kind === "check-open") return (
          <button type="button" key={i} onClick={() => onToggleChecklist(i)} className="flex w-full items-start gap-2 text-left">
            <Square size={13} className="text-muted-foreground mt-0.5 flex-shrink-0" />
            <span>{line.slice(4)}</span>
          </button>
        );
        if (kind === "bullet") return (
          <div key={i} className="flex items-start gap-2">
            <span className="text-primary font-bold mt-0.5 text-[10px] flex-shrink-0">•</span>
            <span>{line.slice(2)}</span>
          </div>
        );
        return <p key={i}>{line || " "}</p>;
      })}
    </div>
  );
}
