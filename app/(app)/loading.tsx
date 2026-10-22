/** Shown instantly while the next screen loads, so taps feel immediate. */
export default function Loading() {
  return (
    <div className="animate-pulse pt-6" aria-busy="true" aria-label="Loading">
      <div className="flex items-center justify-between pb-4">
        <div className="h-7 w-36 rounded-xl bg-card-2" />
        <div className="h-10 w-10 rounded-full bg-card-2" />
      </div>
      <div className="h-32 rounded-3xl bg-card-2" />
      <div className="mt-4 h-12 rounded-2xl bg-card-2" />
      <div className="mt-4 space-y-3 rounded-3xl bg-card p-4 ring-1 ring-line">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-card-2" />
            <div className="h-4 flex-1 rounded-lg bg-card-2" />
            <div className="h-4 w-16 rounded-lg bg-card-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
