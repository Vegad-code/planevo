'use client';

import BrunoChat from '@/components/bruno/BrunoChat';

export default function ChatPage() {
  return (
    <div data-testid="dashboard-chat-page" className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Suppress the floating bubble on this page since we're embedding the chat */}
      <script
        dangerouslySetInnerHTML={{
          __html: `window.dispatchEvent(new CustomEvent('bruno-suppress', { detail: { suppressed: true } }));`,
        }}
      />
      <div className="flex-1 flex flex-col">
        <InlineBrunoChat />
      </div>
    </div>
  );
}

/** Inline (non-floating) version of BrunoChat for the dedicated chat page */
function InlineBrunoChat() {
  return (
    <div className="flex-1 flex flex-col bg-[var(--color-paper)] border border-[var(--color-line)] rounded-[22px] overflow-hidden shadow-sm">
      {/* We render the BrunoChat component in always-open mode via a wrapper */}
      <InlineChatWrapper />
    </div>
  );
}

/**
 * Renders BrunoChat and forces it open on mount.
 * Since BrunoChat manages its own open/close state, we trigger it to open.
 */
function InlineChatWrapper() {
  return (
    <>
      {/* Dispatch open event to the floating BrunoChat */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            requestAnimationFrame(() => {
              window.dispatchEvent(new Event('open-bruno-chat'));
            });
          `,
        }}
      />
      <div className="fixed bottom-0 right-0 left-0 top-0 z-0 pointer-events-none" />
      <BrunoChat />
    </>
  );
}
