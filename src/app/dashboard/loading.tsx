export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 rounded-lg animate-shimmer" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-2xl animate-shimmer" />
        ))}
      </div>
      <div className="h-40 rounded-2xl animate-shimmer" />
      <div className="h-64 rounded-2xl animate-shimmer" />
    </div>
  );
}
