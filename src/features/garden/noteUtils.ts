export type NoteLineKind = "check-open" | "check-done" | "bullet" | "text";

export function getNoteLineKind(line: string): NoteLineKind {
  if (/^\[[xX]\]\s/.test(line)) return "check-done";
  if (/^\[ \]\s/.test(line)) return "check-open";
  if (/^-\s/.test(line)) return "bullet";
  return "text";
}

export function toggleChecklistLine(content: string, lineIndex: number): string {
  const lines = content.split("\n");
  const line = lines[lineIndex];
  if (line === undefined) return content;
  const kind = getNoteLineKind(line);
  if (kind === "check-open") lines[lineIndex] = line.replace(/^\[ \]/, "[x]");
  if (kind === "check-done") lines[lineIndex] = line.replace(/^\[[xX]\]/, "[ ]");
  return lines.join("\n");
}

export function insertNotePrefix(content: string, prefix: "- " | "[ ] ", selectionStart = content.length, selectionEnd = selectionStart) {
  const before = content.slice(0, selectionStart);
  const after = content.slice(selectionEnd);
  const needsNewLine = before.length > 0 && !before.endsWith("\n");
  const inserted = `${needsNewLine ? "\n" : ""}${prefix}`;
  const value = `${before}${inserted}${after}`;
  const cursor = before.length + inserted.length;
  return { value, cursor };
}
