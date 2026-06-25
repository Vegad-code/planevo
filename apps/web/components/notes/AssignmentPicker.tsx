'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type Assignment = {
  id: string;
  name: string;
  course_name: string | null;
  due_at: string | null;
};

export function AssignmentPicker({
  noteId,
  onLinked,
}: {
  noteId: string;
  onLinked?: () => void;
}) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    void fetch('/api/notes/assignments')
      .then((r) => r.json())
      .then((d) => setAssignments(d.assignments ?? []));
  }, [open]);

  const link = async (assignment: Assignment) => {
    const response = await fetch(`/api/notes/${noteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        linkedAssignmentId: assignment.id,
        canvasCourseName: assignment.course_name,
        noteKind: 'class_note',
      }),
    });
    if (!response.ok) {
      toast.error('Could not link assignment');
      return;
    }
    toast.success(`Linked to ${assignment.name}`);
    setOpen(false);
    onLinked?.();
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-(--color-line-strong) bg-paper px-3 py-1.5 text-xs font-medium text-(--color-ink-soft) transition-colors hover:bg-cream-2"
      >
        Link assignment
      </button>
      {open && (
        <div className="mt-2 max-h-48 overflow-y-auto rounded-2xl bg-paper p-2 shadow-sm">
          {assignments.length === 0 ? (
            <p className="p-2 text-xs text-(--color-ink-faint)">No Canvas assignments cached.</p>
          ) : (
            assignments.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => void link(a)}
                className="block w-full rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-cream"
              >
                <p className="font-medium text-(--color-ink)">{a.name}</p>
                <p className="text-xs text-(--color-ink-faint)">{a.course_name}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
