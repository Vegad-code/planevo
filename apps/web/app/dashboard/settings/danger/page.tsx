export default function DangerZonePage() {
  return (
    <div className="space-y-8 animate-fade-in text-[#2A2118]">
      <div>
        <h2 className="text-3xl font-serif italic text-[#C56B5E] mb-3">Danger Zone</h2>
        <p className="text-sm font-medium text-[#8a7b66] max-w-2xl leading-relaxed">
          Destructive actions that cannot be undone.
        </p>
      </div>
      
      <div className="bg-white rounded-2xl border border-red-200 p-12 text-center shadow-sm">
        <p className="text-[#C56B5E] font-medium">Danger zone actions coming soon.</p>
      </div>
    </div>
  );
}
