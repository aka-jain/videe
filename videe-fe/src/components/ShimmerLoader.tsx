export const ShimmerLoader = () => {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-6">
        {/* Blue gradient circle with shimmer */}
        <div className="relative">
          <div className="w-14 h-14 bg-gradient-to-r from-zinc-600 to-zinc-700 rounded-full mx-auto relative overflow-hidden">
            {/* Shimmer effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
          </div>
        </div>

        {/* Two shimmer rows */}
        <div className="space-y-3">
          <div className="h-3 bg-gradient-to-r from-zinc-700 via-zinc-600 to-zinc-700 rounded animate-pulse w-48 mx-auto"></div>
          <div className="h-3 bg-gradient-to-r from-zinc-700 via-zinc-600 to-zinc-700 rounded animate-pulse w-32 mx-auto"></div>
        </div>
      </div>
    </div>
  );
};
