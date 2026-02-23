export const ShimmerLoaderBars = () => {
    return (
        <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-6">

                {/* Two shimmer rows */}
                <div className="space-y-3">
                    <div className="h-3 bg-gradient-to-r from-zinc-700 via-zinc-600 to-zinc-700 rounded animate-pulse w-48 mx-auto"></div>
                    <div className="h-3 bg-gradient-to-r from-zinc-700 via-zinc-600 to-zinc-700 rounded animate-pulse w-32 mx-auto"></div>
                </div>
            </div>
        </div>
    );
};