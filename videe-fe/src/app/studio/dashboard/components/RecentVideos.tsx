"use client";

import React from "react";
import VideoCard from "../../../../components/studio/VideoCard";
import { useGenerationData } from "../../../../hooks/useGenerationData";
import Link from "next/link";
import { GenerationSummary } from "@/lib/videoGenieApi";

interface RecentVideosProps {
  showAll?: boolean;
}

export default function RecentVideos({ showAll = false }: RecentVideosProps) {
  const { history, loading, getRecentGenerations } = useGenerationData();

  const displayedVideos = showAll ? history : getRecentGenerations(3);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleVideoClick = (generation: GenerationSummary) => {
    // Navigate to the generation page
    window.location.href = `/studio/create/${generation.generationId}`;
  };

  const handleEdit = (generation: GenerationSummary) => {
    // Navigate to edit page
    window.location.href = `/studio/create/${generation.generationId}`;
  };

  const handleDelete = (generation: GenerationSummary) => {
    // Handle delete action - could show confirmation modal
    console.log("Delete generation:", generation.generationId);
  };

  if (loading) {
    return (
      <div className="bg-zinc-800 p-6 rounded-lg shadow-md border border-zinc-800">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-zinc-200">
            {showAll ? "All Videos" : "Recent Videos"}
          </h2>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="h-16 bg-zinc-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-800 p-6 rounded-lg shadow-md border border-zinc-800">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-zinc-200">
          {showAll ? "All Videos" : "Recent Videos"}
        </h2>
        {!showAll && history.length > 3 && (
          <Link
            href="/studio/videos"
            className="cursor-pointer text-blue-400 hover:text-blue-600 text-sm font-medium"
          >
            View All
          </Link>
        )}
      </div>

      <div className="space-y-3">
        {displayedVideos.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-zinc-400">No videos yet</p>
            <Link
              href="/studio/create"
              className="inline-block mt-2 text-blue-400 hover:text-blue-300"
            >
              Create your first video
            </Link>
          </div>
        ) : (
          displayedVideos.map((generation) => (
            <VideoCard
              key={generation.generationId}
              title={generation.title || generation.prompt}
              views={0} // Could be added to generation data later
              date={formatDate(generation.createdAt)}
              duration="0:00" // Could be added to generation data later
              thumbnail="" // Could be added to generation data later
              showActions={showAll}
              onClick={() => handleVideoClick(generation)}
              onEdit={() => handleEdit(generation)}
              onDelete={() => handleDelete(generation)}
            />
          ))
        )}
      </div>
    </div>
  );
}
