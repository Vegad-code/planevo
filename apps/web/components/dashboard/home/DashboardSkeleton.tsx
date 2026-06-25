export function DashboardSkeleton() {
  return (
    <div className="animate-pulse pb-12">
      <div className="pb-7 border-b border-line mb-6">
        <div className="w-32 h-3 bg-line-strong rounded-full mb-4" />
        <div className="w-64 h-12 md:w-96 md:h-14 bg-line-strong rounded-xl mb-4" />
        <div className="w-full max-w-lg h-4 bg-line-strong rounded-full" />
      </div>

      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="w-14 h-16 bg-line-strong rounded-2xl" />
        ))}
      </div>

      <div className="bg-(--color-paper) border border-line rounded-[22px] p-6 md:p-9 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-9 mb-6 min-h-70">
        <div className="flex flex-col gap-4">
          <div className="w-40 h-4 bg-line-strong rounded-full" />
          <div className="w-full max-w-sm h-12 bg-line-strong rounded-xl" />
          <div className="w-3/4 h-10 bg-line-strong rounded-xl" />
        </div>
        <div className="bg-cream rounded-2xl h-36" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-6">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="bg-(--color-paper) rounded-[22px] p-6 border border-line h-72 flex flex-col gap-3"
          >
            <div className="w-24 h-3 bg-line-strong rounded-full" />
            <div className="w-40 h-8 bg-line-strong rounded-xl" />
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="h-12 bg-line-strong/60 rounded-2xl" />
            ))}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <div className="bg-(--color-paper) rounded-[22px] p-6 border border-line h-32" />
        <div className="bg-(--color-paper) rounded-[22px] p-6 border border-line h-48" />
      </div>
    </div>
  );
}
