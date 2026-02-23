"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Play, Plus, Share, Download } from "lucide-react";
import Button from "../../../../components/Button";
import VideoGenerationLoader from "../../../../components/studio/VideoGenerationLoader";
import { LOADER_STAGES } from "../../../../config/studio";
import { useGeneration } from "../../../../contexts/GenerationContext";
import { GenerationStatus } from "../../../../lib/videoGenieApi";
import {
  startVideoGeneration,
  GenerationDetails,
} from "../../../../lib/videoGenieApi";
import { GenerationSummary } from "@/hooks/useHistory";
import { ShimmerLoader } from "@/components/ShimmerLoader";

// Add shimmer animation to global CSS
const shimmerStyles = `
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
  
  .animate-shimmer {
    animation: shimmer 2s infinite;
  }
`;

export default function GenerationPage() {
  const params = useParams();
  const router = useRouter();
  const { getGenerationById, updateGenerationStatus, refresh, setAutoRefresh } =
    useGeneration();

  const [generation, setGeneration] = useState<GenerationSummary | null>(null);
  const [currentStage, setCurrentStage] = useState<string>("");
  const [completedStages, setCompletedStages] = useState<Set<string>>(
    new Set()
  );
  const [finalVideoUrl, setFinalVideoUrl] = useState<string>("");
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  const generationId = params.id as string;
  const generationRef = useRef(generation);
  generationRef.current = generation;

  // Disable auto-refresh when viewing a specific generation to prevent multiple API calls
  useEffect(() => {
    setAutoRefresh(false);

    // Re-enable auto-refresh when component unmounts
    return () => {
      setAutoRefresh(true);
    };
  }, [setAutoRefresh]);

  // Add shimmer styles to document head - only run once
  useEffect(() => {
    if (!document.getElementById("shimmer-styles")) {
      const style = document.createElement("style");
      style.id = "shimmer-styles";
      style.textContent = shimmerStyles;
      document.head.appendChild(style);
    }
  }, []);

  // Fetch generation data by ID from context first, then API if needed
  const getVideoGeneration = useCallback(async () => {
    const generation = await getGenerationById(generationId);
    setGeneration(generation as GenerationSummary);
    setIsInitialLoading(false);
  }, [generationId, getGenerationById]);

  useEffect(() => {
    getVideoGeneration();
  }, [getVideoGeneration, history]);

  // Function to start video generation - remove generationId from dependencies
  const startGeneration = useCallback(async () => {
    const currentGeneration = generationRef.current;
    if (!currentGeneration) return;

    try {
      console.log("Starting video generation...");
      setCurrentStage("script");

      // Call the single video generation API
      const response = await startVideoGeneration({
        prompt: currentGeneration.prompt,
        language: currentGeneration.language,
        options: {
          aspectRatio: currentGeneration?.aspectRatio,
          twoPhaseScriptGeneration: currentGeneration?.twoPhaseScriptGeneration,
        },
        generationId,
      });

      console.log("Video generation started:", response);
    } catch (error: unknown) {
      console.error("Error starting video generation:", error);
      setError("Failed to start video generation");
      setCurrentStage("error");
    }
  }, []); // Remove generationId dependency since it's stable

  // Handle generation start and status updates - optimize dependencies
  useEffect(() => {
    if (!generation) {
      refresh();
      setIsInitialLoading(true);
      return;
    }

    // console.log("Generation status changed:", generation.status);

    // Handle different status states
    switch (generation.status) {
      case "initialized":
        console.log("Starting video generation for initialized status");
        setIsInitialLoading(false);
        startGeneration();
        break;

      case "script_generated":
        setCurrentStage("audio");
        setCompletedStages(new Set(["script"]));
        break;

      case "audio_generated":
        setCurrentStage("keywords");
        setCompletedStages(new Set(["script", "audio"]));
        break;

      case "keywords_generated":
        setCurrentStage("clips");
        setCompletedStages(new Set(["script", "audio", "keywords"]));
        break;

      case "clips_processed":
        setCurrentStage("concatenate");
        setCompletedStages(new Set(["script", "audio", "keywords", "clips"]));
        break;

      case "video_merged":
        setCurrentStage("subtitles");
        setCompletedStages(
          new Set(["script", "audio", "keywords", "clips", "concatenate"])
        );
        break;

      case "final_video_ready":
        setCurrentStage("complete");
        setCompletedStages(new Set(LOADER_STAGES.map((stage) => stage.id)));
        if (generation.finalVideo?.videoUrl) {
          setFinalVideoUrl(generation.finalVideo.videoUrl);
        }
        break;

      case "uploaded":
        setCurrentStage("complete");
        setCompletedStages(new Set(LOADER_STAGES.map((stage) => stage.id)));
        if (generation.finalVideo?.videoUrl) {
          setFinalVideoUrl(generation.finalVideo.videoUrl);
        }
        break;

      case "error":
        setCurrentStage("error");
        setError("Video generation failed. Please try again.");
        break;

      default:
        console.log("Unknown status:", generation.status);
        break;
    }
  }, [generation?.status]); // Remove startGeneration from dependencies

  const handleRetry = async () => {
    console.log("Retrying video generation...");
    setCompletedStages(new Set());
    setCurrentStage("initialized");
    setFinalVideoUrl("");
    setError(null);
    setIsRetrying(true);

    refresh();
    try {
      // If we have generation data, restart the generation
      if (generation) {
        console.log("Restarting video generation with existing data");
        const response = await startVideoGeneration({
          prompt: generation.prompt,
          language: generation.language,
          options: {
            aspectRatio: generation?.aspectRatio,
            twoPhaseScriptGeneration: generation?.twoPhaseScriptGeneration,
          },
          generationId,
        });
        updateGenerationStatus(generationId, "initialized");
      }
    } catch (error) {
      console.error("Error retrying video generation:", error);
      setError("Failed to restart video generation. Please try again.");
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDownload = () => {
    if (finalVideoUrl) {
      const link = document.createElement("a");
      link.href = finalVideoUrl;
      link.download = `video-${generationId}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Show loading state
  if (isInitialLoading || !generation) {
    return <ShimmerLoader />;
  }

  // Show error state
  if (error || generation.status === "error") {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg
              className="h-8 w-8 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            {error ? "Video Generation Failed" : "Generation Not Found"}
          </h3>
          <p className="text-zinc-400 mb-6">
            {error || "The requested video generation could not be found."}
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              className="gap-2"
            >
              {isRetrying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  {error ? "Retry Generation" : "Refresh"}
                </>
              )}
            </Button>
            <Button
              onClick={() => router.push("/studio/create")}
              disabled={isRetrying}
              variant="outline"
            >
              Create New Video
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show video frame when completed
  if (
    generation.status === "final_video_ready" ||
    generation.status === "uploaded"
  ) {
    return (
      <div className="p-8 flex flex-col h-full max-w-4xl mx-auto items-center justify-center p-6 text-white">
        <div className="bg-zinc-900 rounded-2xl p-8 max-w-2xl w-full mx-4">
          <div className="text-center space-y-6">
            <h3 className="text-xl font-semibold text-white">
              Video Generated Successfully!
            </h3>

            <div className="text-sm text-zinc-400 mb-4">
              &quot;{generation.prompt}&quot;
            </div>

            {/* Video Player */}
            <div className="bg-zinc-800 rounded-2xl p-4 flex items-center justify-center">
              {finalVideoUrl ? (
                <div className="w-full max-w-2xl">
                  <video
                    controls
                    className="w-full h-auto rounded-lg"
                    style={{ maxHeight: "70vh" }}
                  >
                    <source src={finalVideoUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : (
                <div className="text-center space-y-6">
                  <div className="relative">
                    <Play className="h-40 w-16 text-blue-500 mx-auto mb-4" />
                  </div>
                  <div className="space-y-3">
                    <div className="h-3 bg-gradient-to-r from-zinc-700 via-zinc-600 to-zinc-700 rounded animate-pulse w-48 mx-auto"></div>
                    <div className="h-3 bg-gradient-to-r from-zinc-700 via-zinc-600 to-zinc-700 rounded animate-pulse w-32 mx-auto"></div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 justify-center flex-wrap">
              <Button
                onClick={() => router.push("/studio/create")}
                className="gap-1"
              >
                <Plus size={16} /> Create New Video
              </Button>
              <Button
                onClick={handleDownload}
                variant="secondary"
                className="gap-2"
                disabled={!finalVideoUrl}
              >
                <Download size={16} /> Download Video
              </Button>
              <Button
                onClick={() => router.push("/studio/dashboard")}
                variant="secondary"
                className="bg-red-500 hover:bg-red-100 gap-2"
              >
                <Share size={16} /> Share on Youtube
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loader for generation in progress
  return (
    <div className="p-8 flex items-center justify-center">
      <VideoGenerationLoader
        currentStage={currentStage}
        completedStages={completedStages}
        prompt={generation.prompt}
        status={
          (generation.status as string) === "error"
            ? "error"
            : (generation.status as string) === "final_video_ready" ||
              (generation.status as string) === "uploaded"
            ? "completed"
            : "loading"
        }
        onRetry={handleRetry}
      />
    </div>
  );
}
