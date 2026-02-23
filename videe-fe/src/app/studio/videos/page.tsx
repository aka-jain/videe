"use client";

import React, { useState } from "react";
import { useGeneration } from "../../../contexts/GenerationContext";
import {
  FaSpinner,
  FaVideo,
  FaYoutube,
  FaCalendar,
  FaClock,
  FaLanguage,
  FaExpand,
  FaSearch,
  FaFilter,
} from "react-icons/fa";
import Link from "next/link";
import { GenerationSummary } from "@/lib/videoGenieApi";

const VideosPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const { history, loading, error, hasMore, refresh, loadMore } = useGeneration();

  const filteredHistory = history.filter((generation: GenerationSummary) => {
    const matchesSearch =
      generation.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      generation.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || generation.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "final_video_ready":
      case "uploaded":
        return "text-green-400 bg-green-400/10";
      case "error":
        return "text-red-400 bg-red-400/10";
      case "initialized":
      case "script_generated":
      case "audio_generated":
      case "keywords_generated":
      case "clips_processed":
      case "video_merged":
        return "text-yellow-400 bg-yellow-400/10";
      default:
        return "text-gray-400 bg-gray-400/10";
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case "initialized":
        return "Initializing";
      case "script_generated":
        return "Script Ready";
      case "audio_generated":
        return "Audio Ready";
      case "keywords_generated":
        return "Keywords Ready";
      case "clips_processed":
        return "Clips Ready";
      case "video_merged":
        return "Video Merged";
      case "final_video_ready":
        return "Video Ready";
      case "uploaded":
        return "Uploaded";
      case "error":
        return "Error";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Video History</h1>
          <p className="text-zinc-400">
            Manage and view all your generated videos
          </p>
        </div>

        {/* Controls */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <FaSearch
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400"
                size={14}
              />
              <input
                type="text"
                placeholder="Search videos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <FaFilter
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400"
                size={14}
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none appearance-none"
              >
                <option value="all">All Status</option>
                <option value="final_video_ready">Ready</option>
                <option value="uploaded">Uploaded</option>
                <option value="error">Error</option>
                <option value="initialized">In Progress</option>
              </select>
            </div>

            {/* Sort Order */}
            <button
              onClick={() =>
                setSortOrder(sortOrder === "desc" ? "asc" : "desc")
              }
              className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors flex items-center gap-2"
            >
              <FaClock size={14} />
              {sortOrder === "desc" ? "Newest First" : "Oldest First"}
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={refresh}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
          >
            {loading ? <FaSpinner className="animate-spin" size={14} /> : null}
            Refresh
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg">
            <p className="text-red-400">Error loading videos: {error}</p>
            <button
              onClick={refresh}
              className="mt-2 text-sm text-red-300 hover:text-red-200 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Video Grid */}
        {filteredHistory.length === 0 ? (
          <div className="text-center py-12">
            <FaVideo className="mx-auto text-zinc-600 mb-4" size={48} />
            <h3 className="text-xl font-medium mb-2">
              {searchTerm || statusFilter !== "all"
                ? "No matching videos"
                : "No videos yet"}
            </h3>
            <p className="text-zinc-400 mb-6">
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your search or filter criteria"
                : "Start creating your first video to see it here"}
            </p>
            {!searchTerm && statusFilter === "all" && (
              <Link
                href="/studio/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <FaVideo size={16} />
                Create Video
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHistory.map((generation: GenerationSummary) => (
              <div
                key={generation.generationId}
                className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden hover:border-zinc-700 transition-colors"
              >
                {/* Video Thumbnail Placeholder */}
                <div className="aspect-video bg-zinc-800 flex items-center justify-center">
                  <FaVideo className="text-zinc-600" size={32} />
                </div>

                {/* Content */}
                <div className="p-4">
                  {/* Title/Prompt */}
                  <h3 className="font-medium mb-2 line-clamp-2">
                    {generation.title || generation.prompt}
                  </h3>

                  {/* Status */}
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                        generation.status
                      )}`}
                    >
                      {getStatusLabel(generation.status)}
                    </span>
                    {generation.hasYouTubeUpload && (
                      <FaYoutube
                        className="text-red-500"
                        size={14}
                        title="Uploaded to YouTube"
                      />
                    )}
                  </div>

                  {/* Meta Info */}
                  <div className="space-y-1 text-sm text-zinc-400 mb-4">
                    <div className="flex items-center gap-2">
                      <FaCalendar size={12} />
                      {formatDate(generation.createdAt)}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <FaLanguage size={12} />
                        {generation.language}
                      </div>
                      <div className="flex items-center gap-1">
                        <FaExpand size={12} />
                        {generation.aspectRatio}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/studio/create/${generation.generationId}`}
                      className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm text-center transition-colors"
                    >
                      View Details
                    </Link>
                    {generation.hasVideo && (
                      <button className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-sm transition-colors">
                        Download
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More */}
        {hasMore && (
          <div className="text-center mt-8">
            <button
              onClick={loadMore}
              disabled={loading}
              className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800/50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2 mx-auto"
            >
              {loading ? (
                <FaSpinner className="animate-spin" size={14} />
              ) : null}
              Load More Videos
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideosPage;
