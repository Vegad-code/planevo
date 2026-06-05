export default function DangerZonePage() {
  return (
    <div className="space-y-8 animate-fade-in text-settings-text">
      <div>
        <h2 className="text-3xl font-serif italic text-[var(--color-rose)] mb-3">Danger Zone</h2>
        <p className="text-sm font-medium text-settings-text-muted max-w-2xl leading-relaxed">
          Destructive actions that cannot be undone.
        </p>
      </div>
      
      <div className="bg-settings-card rounded-2xl border border-red-200 p-12 text-center shadow-sm">
        <p className="text-[var(--color-rose)] font-medium">Danger zone actions coming soon.</p>
      </div>
    </div>
  );
}
