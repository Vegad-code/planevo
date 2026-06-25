'use client';

import { useEffect, useRef } from 'react';
import { BlockNoteView } from '@blocknote/shadcn';
import { useCreateBlockNote } from '@blocknote/react';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/shadcn/style.css';
import type { BlockNoteBlock } from '@planevo/notes-core';
import { planevoSchema } from '@/lib/notes/blocknoteSchema';

export function NoteEditorInner({
  initialBlocks,
  onChange,
}: {
  initialBlocks: BlockNoteBlock[];
  onChange: (blocks: BlockNoteBlock[]) => void;
}) {
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const seededRef = useRef(false);

  const editor = useCreateBlockNote({
    schema: planevoSchema,
    initialContent: initialBlocks as never,
  });

  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;

    let skipInitial = true;
    const unsubscribe = editor.onChange(() => {
      if (skipInitial) {
        skipInitial = false;
        return;
      }
      onChangeRef.current(editor.document as unknown as BlockNoteBlock[]);
    });

    return () => unsubscribe();
  }, [editor]);

  return (
    <BlockNoteView
      editor={editor}
      theme="light"
      className="planevo-blocknote"
    />
  );
}
