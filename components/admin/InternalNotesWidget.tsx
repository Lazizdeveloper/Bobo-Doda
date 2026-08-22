"use client";

import { useState } from "react";
import { getInternalNotes, addInternalNote } from "@/lib/admin-api";
import { type InternalNote } from "@/lib/admin-types";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

interface InternalNotesWidgetProps {
  targetId: string;
  targetType: InternalNote["targetType"];
  title?: string;
}

export function InternalNotesWidget({
  targetId,
  targetType,
  title = "Ichki Operator Eslatmalari (Faqat Adminlar Ko'radi)",
}: InternalNotesWidgetProps) {
  const [notes, setNotes] = useState<InternalNote[]>(() => getInternalNotes(targetId));
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(false);

  function handleAdd() {
    if (newNote.trim().length < 2) return;
    setLoading(true);
    try {
      const created = addInternalNote(targetId, targetType, newNote.trim());
      setNotes((prev) => [created, ...prev]);
      setNewNote("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
          <span>📝</span> {title}
        </h4>
        <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-3xs font-semibold text-amber-900">
          {notes.length} ta eslatma
        </span>
      </div>

      {/* Input area */}
      <div className="space-y-2">
        <Textarea
          rows={2}
          placeholder="Ushbu ob'ekt bo'yicha maxfiy izoh, tekshiruv natijasi yoki xulosa qoldiring..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          className="bg-card text-xs"
        />
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={handleAdd}
            disabled={newNote.trim().length < 2 || loading}
            loading={loading}
            className="bg-amber-700 hover:bg-amber-800 text-white"
          >
            Eslatma qo‘shish
          </Button>
        </div>
      </div>

      {/* Notes List */}
      <div className="space-y-2 max-h-56 overflow-y-auto pt-1">
        {notes.length === 0 ? (
          <p className="text-center py-3 text-2xs italic text-amber-800/70">
            Hozircha hech qanday ichki eslatma qoldirilmagan.
          </p>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="rounded-lg border border-amber-200 bg-amber-50/80 p-2.5 text-xs text-ink shadow-xs"
            >
              <div className="flex items-center justify-between text-2xs text-amber-900 font-medium mb-1">
                <span className="font-bold">{note.adminName}</span>
                <span className="text-muted">{formatDate(note.createdAt)}</span>
              </div>
              <p className="text-xs text-ink whitespace-pre-wrap leading-relaxed">
                {note.text}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
