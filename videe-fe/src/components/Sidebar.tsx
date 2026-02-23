"use client";

import React, { useState, useEffect } from "react";
import { FaCog, FaSpinner, FaTrashAlt } from "react-icons/fa";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "../contexts/SidebarContext";
import { useGeneration } from "../contexts/GenerationContext";
import { ChartBar, Edit, Menu, Plus, User, Video } from "lucide-react";
import { GenerationDetails, GenerationSummary } from "@/lib/videoGenieApi";

const HISTORY_INTERVAL_MS = 10000;

// Shimmer component for loading states
const ShimmerItem: React.FC = () => (
  <div className="flex items-center gap-3  animate-pulse w-full mb-2">
    <div className="w-[100%] h-10 bg-zinc-800 "></div>

  </div>
);

const ShimmerLoader: React.FC = () => (
  <div className="w-full">
    {Array.from({ length: 2 }).map((_, index) => (
      <ShimmerItem key={index} />
    ))}
  </div>
);

const dashboardOptions = [
  {
    label: "Analytics",
    icon: <ChartBar size={16} />,
    href: "/studio/dashboard",
  },
  { label: "Videos", icon: <Video size={16} />, href: "/studio/videos" },
  { label: "Video Tool", icon: <Edit size={16} />, href: "/studio/tools" },
  { label: "Community", icon: <User size={16} />, href: "/studio/community" },
];

const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const [viewMode, setViewMode] = useState<"create" | "dashboard">("dashboard");
  const { sidebarCollapsed, toggleSidebar } = useSidebar();
  const { history, loading, error, hasMore, refresh, loadMore,
    areAllGenerationsCompleted, clearHistory
  } = useGeneration();
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (pathname.startsWith("/studio/create")) {
      setViewMode("create");
    } else {
      setViewMode("dashboard");
    }
  }, [pathname]);

  // Add 10-second polling for history updates
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (interval && areAllGenerationsCompleted()) {
      clearInterval(interval);
    }
    else if (!areAllGenerationsCompleted()) {
      interval = setInterval(() => {
        refresh();
      }, HISTORY_INTERVAL_MS); // 10 seconds
    }

    return () => { if (interval) { clearInterval(interval) } };
  }, [refresh, areAllGenerationsCompleted]);

  const formatTimeAgo = (dateString: string) => {
    const now = Date.now();
    const date = new Date(dateString);
    const diff = now - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getStatusIcon = (status?: string, isInstantVideo?: boolean) => {
    switch (status) {
      case "initialized":
      case "script_generated":
      case "audio_generated":
      case "keywords_generated":
      case "clips_processed":
      case "video_merged":
        return isInstantVideo ? <FaSpinner className="animate-spin text-blue-400" /> : <div className="w-2 h-2 bg-orange-400 rounded-full" />
      case "final_video_ready":
      case "uploaded":
        return <div className="w-2 h-2 bg-green-400 rounded-full" />;
      case "error":
        return <div className="w-2 h-2 bg-red-400 rounded-full" />;
      default:
        return <div className="w-2 h-2 bg-gray-400 rounded-full" />;
    }
  };

  const getStatusDisplay = (status?: string) => {
    switch (status) {
      case "initialized":
        return "Initializing...";
      case "script_generated":
        return "Script ready";
      case "audio_generated":
        return "Audio ready";
      case "keywords_generated":
        return "Keywords ready";
      case "clips_processed":
        return "Clips ready";
      case "video_merged":
        return "Video merged";
      case "final_video_ready":
        return "Video ready";
      case "uploaded":
        return "Uploaded";
      case "error":
        return "Error";
      default:
        return "Unknown";
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Clear all video history? This cannot be undone.")) return;
    setClearing(true);
    try {
      await clearHistory();
    } finally {
      setClearing(false);
    }
  };

  // Infinite scroll handler
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const threshold = 50; // pixels from bottom to trigger load

    if (scrollHeight - scrollTop - clientHeight < threshold && hasMore && !loading) {
      loadMore();
    }
  };

  return (
    <aside
      className={`bg-zinc-900 text-white h-screen flex flex-col shadow-lg border-r border-zinc-800 transition-all duration-300 ${sidebarCollapsed ? "w-16" : "w-64"
        }`}
    >
      <div
        className={`flex flex-col mb-8 ${sidebarCollapsed ? "px-2 py-3" : "px-4 py-3"}`}
      >
        <div className="text-2xl font-bold text-blue-300 gap-2 bg-gradient-to-r from-blue-400 to-blue-700 bg-clip-text text-transparent flex items-center justify-between">
          {sidebarCollapsed ? "V" : "VIDEE"}
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Menu size={18} />
          </button>
        </div>
        {!sidebarCollapsed && (
          <div className="text-xs text-zinc-200">AI Meets Imagination</div>
        )}
      </div>

      <nav
        className={`flex flex-col gap-2 ${sidebarCollapsed ? "px-2" : ""}`}
      >
        {viewMode === "dashboard" ? (
          dashboardOptions.map((option) => {
            const isActive = pathname === option.href;
            return (
              <Link
                key={option.label}
                href={option.href}
                className={`flex items-center gap-3 px-3 py-2 rounded transition-colors text-sm ${isActive
                  ? "bg-zinc-800 text-white shadow-md"
                  : "text-zinc-100 hover:bg-zinc-800"
                  }`}
                title={sidebarCollapsed ? option.label : undefined}
              >
                <span
                  className={`text-lg ${isActive ? "text-white" : "text-zinc-300"
                    }`}
                >
                  {option.icon}
                </span>
                {!sidebarCollapsed && (
                  <span className={isActive ? "font-semibold" : "font-medium"}>
                    {option.label}
                  </span>
                )}
              </Link>
            );
          })
        ) : (
          <>
            <Link
              href="/studio/create"
              className={`mb-2 text-white shadow-lg hover:shadow-xl px-0 hover:from-blue-500 hover:to-blue-700 focus:ring-blue-500 active:from-blue-600 active:to-blue-800 rounded-full flex py-2 items-center gap-2 justify-center text-sm ${!sidebarCollapsed ? "mx-4" : ""} ${pathname !== "/studio/create"
                ? "bg-gradient-to-r from-blue-500 to-blue-800 "
                : " bg-zinc-800 text-zinc-300"
                }`}
              title={sidebarCollapsed ? "New Video" : undefined}
            >

              {sidebarCollapsed ? (
                <div className="w-8 h-8 rounded-full to-blue-700 flex items-center justify-center">
                  <Plus size={16} />
                </div>
              ) : (
                <span className="font-medium flex items-center gap-1">
                  <Plus size={16} /> Create Video
                </span>
              )}
            </Link>

            {!sidebarCollapsed && (
              <div className="flex items-center justify-between px-4 py-1">
                <span className="text-xs font-semibold text-zinc-500 uppercase">
                  Video Generations
                </span>
                {error && (
                  <button
                    onClick={refresh}
                    className="text-xs text-red-400 hover:text-red-300"
                    title="Retry loading history"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}

            {!sidebarCollapsed && (
              <>
                {error ? (
                  <div className="px-4 py-2 text-xs text-red-400">
                    Failed to load history
                  </div>
                ) : loading && history.length === 0 ? (
                  <div className="px-4 mt-2 flex flex-col items-center gap-2">
                    <ShimmerLoader />
                  </div>
                ) : history.length === 0 ? (
                  <div className="px-4 py-2 text-xs text-zinc-500">
                    No videos yet
                  </div>
                ) : (
                  <>
                    <div
                      className="max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-800"
                      onScroll={handleScroll}
                    >
                      {history.map((generation: GenerationSummary) => {
                        const isActive =
                          pathname.startsWith('/studio/create/') && pathname.includes(generation.generationId);
                        return (
                          <Link
                            key={generation.generationId}
                            href={`/studio/create/${generation.generationId}${generation.isInstantVideo ? "" : "/controlled"}`}
                            className={`flex items-center gap-3 px-4 py-2 rounded transition-colors text-sm truncate ${isActive
                              ? "bg-zinc-800 text-white"
                              : "text-zinc-300 hover:bg-zinc-800"
                              }`}
                            title={generation.title || generation.prompt}
                          >
                            <div className="w-3 flex items-center justify-start">
                              {getStatusIcon(generation.status, generation.isInstantVideo)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div
                                className={`truncate ${isActive ? "font-medium" : "font-normal"
                                  }`}
                              >
                                {(generation.title || generation.prompt).length >
                                  30
                                  ? `${(
                                    generation.title || generation.prompt
                                  ).substring(0, 30)}...`
                                  : generation.title || generation.prompt}
                              </div>
                              <div className="text-xs text-zinc-500 truncate">
                                {formatTimeAgo(generation.createdAt)} •{" "}
                                {getStatusDisplay(generation.status)}
                              </div>
                            </div>
                          </Link>
                        );
                      })}

                      {loading && history.length > 0 && (
                        <div className="px-4 py-2 flex items-center gap-2">
                          {/* <ShimmerLoader /> */}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </nav>
      <div className="flex-1" />

      {/* Footer with Settings and Clear all */}
      <div
        className={`border-t border-zinc-800 ${sidebarCollapsed ? "px-2 py-4" : "px-4 py-4"}`}
      >
        <Link
          href="/studio/settings"
          className="flex items-center gap-3 px-3 py-2 rounded text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
          title={sidebarCollapsed ? "Settings" : undefined}
        >
          <FaCog className="text-zinc-400" />
          {!sidebarCollapsed && <span className="font-medium">Video Settings</span>}
        </Link>
        <button
          type="button"
          onClick={handleClearAll}
          disabled={clearing || history.length === 0}
          className="flex items-center gap-3 px-3 py-2 rounded text-sm text-zinc-300 hover:bg-zinc-800 transition-colors w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
          title={sidebarCollapsed ? "Clear all history" : undefined}
        >
          <FaTrashAlt className="text-zinc-400" />
          {!sidebarCollapsed && <span className="font-medium">{clearing ? "Clearing…" : "Clear all history"}</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
