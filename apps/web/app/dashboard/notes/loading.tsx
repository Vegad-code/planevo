export default function NotesLoading() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row">
      <aside className="hidden w-56 shrink-0 border-r border-(--color-line) bg-paper/80 p-4 lg:block">
        <div className="mb-4 h-10 animate-pulse rounded-full bg-cream-2" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="mb-2 h-9 animate-pulse rounded-xl bg-cream-2" />
        ))}
      </aside>
      <main className="flex-1">
        <div className="border-b border-(--color-line) p-6">
          <div className="h-10 w-48 animate-pulse rounded-lg bg-cream-2" />
          <div className="mt-4 h-10 max-w-xl animate-pulse rounded-full bg-cream-2" />
        </div>
        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-[168px] animate-pulse rounded-3xl bg-cream-2"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
