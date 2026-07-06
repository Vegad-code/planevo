'use client';

import { useRef, useState } from 'react';
import { Microphone, Spinner, Stop } from '@phosphor-icons/react';
import type { ExtractedResponsibility } from '@/lib/command/types';

// COMMAND-INTEGRATION: rendered by CommandCapture in place of its inert mic glyph
// when FEATURES.COMMAND_VOICE is on. On a successful transcription it calls
// onVoicePreview(intakeRunId, summary, previewItems); CommandView threads that into
// the SAME preview flow as text intake (setDrafts/preview panel).

type VoiceState = 'idle' | 'recording' | 'processing';

/** Wall-clock reads kept at module scope (out of the component's render purity). */
function nowMs(): number {
  return Date.now();
}
function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Voice capture affordance — one calm mic button. Records via MediaRecorder, POSTs
 * the audio to /api/command/voice, and surfaces the extracted preview. Permission
 * denial degrades gracefully to "typing still works" (§36); no chat framing (§26.1).
 */
export function CommandVoiceButton({
  onVoicePreview,
  onError,
}: {
  onVoicePreview: (
    intakeRunId: string,
    summary: string,
    previewItems: ExtractedResponsibility[],
  ) => void;
  onError?: (message: string) => void;
}) {
  const [state, setState] = useState<VoiceState>('idle');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);

  async function startRecording() {
    if (state !== 'idle') return;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      onError?.('Microphone access was blocked. You can still type what is on your plate.');
      return;
    }
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      void uploadRecording();
    };
    recorderRef.current = recorder;
    startedAtRef.current = nowMs();
    recorder.start();
    setState('recording');
  }

  function stopRecording() {
    if (state !== 'recording') return;
    recorderRef.current?.stop();
    setState('processing');
  }

  async function uploadRecording() {
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    const seconds = Math.max(1, Math.round((nowMs() - startedAtRef.current) / 1000));
    const form = new FormData();
    form.append('audio', blob, 'capture.webm');
    form.append('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    form.append('clientNow', nowIso());
    form.append('audioSeconds', String(seconds));

    try {
      const res = await fetch('/api/command/voice', { method: 'POST', body: form });
      if (res.status === 429) {
        const body = await res.json().catch(() => ({}));
        onError?.(
          body.message ?? 'Voice capture resets next week. Typing still works.',
        );
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as {
        transcript: string;
        intakeRunId: string;
        previewItems: ExtractedResponsibility[];
      };
      const summary = data.transcript?.trim()
        ? `Heard: “${data.transcript.trim().slice(0, 120)}${data.transcript.length > 120 ? '…' : ''}”`
        : 'Here is what Planevo found';
      onVoicePreview(data.intakeRunId, summary, data.previewItems ?? []);
    } catch {
      onError?.('Could not process that recording. Try again, or type it instead.');
    } finally {
      setState('idle');
    }
  }

  const recording = state === 'recording';
  const processing = state === 'processing';

  return (
    <button
      type="button"
      aria-label={recording ? 'Stop recording' : 'Capture by voice'}
      onClick={recording ? stopRecording : startRecording}
      disabled={processing}
      className={[
        'flex h-9 w-9 flex-none items-center justify-center rounded-full transition-colors',
        recording
          ? 'bg-[var(--color-accent-warm)] text-white'
          : 'text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]',
      ].join(' ')}
    >
      {processing ? (
        <Spinner weight="bold" size={18} className="animate-spin" />
      ) : recording ? (
        <Stop weight="fill" size={16} />
      ) : (
        <Microphone weight="regular" size={18} />
      )}
    </button>
  );
}
