import express, { Request, Response, Router, RequestHandler } from "express";
import { VideoRequest, YouTubeUploadRequest, YouTubeDirectUploadRequest, YouTubeUploadResponse } from "../types";
import { GenerationState } from "../types/generation";
import { StorageFactory } from "../storage/StorageFactory";
import { StorageError, StorageNotFoundError } from "../storage/utils/StorageError";
import { VideoGenerationService } from "../services/videoGenerationService";
import { YouTubeService } from "../services/youtubeService";
import { SubscriptionService } from "../services/subscriptionService";
import {
    SubscriptionError,
    InsufficientCreditsError,
    SubscriptionExpiredError
} from "../utils/subscriptionErrors";
import fs from 'fs';
import { generatePresignedUrl } from "../services/audioService";
import { authenticateUser, optionalAuth } from "../middleware/authMiddleware";

let videoService: VideoGenerationService | null = null;
let youtubeService: YouTubeService | null = null;
let subscriptionService: SubscriptionService | null = null;

// Error handling middleware for storage operations
const withStorageError = (handler: RequestHandler): RequestHandler => {
    return async (req, res, next) => {
        try {
            await handler(req, res, next);
        } catch (error) {
            if (error instanceof InsufficientCreditsError) {
                res.status(402).json({
                    error: "Insufficient credits",
                    message: error.message,
                    renewalTime: error.renewalTime
                });
            } else if (error instanceof SubscriptionExpiredError) {
                res.status(402).json({
                    error: "Subscription expired",
                    message: error.message
                });
            } else if (error instanceof SubscriptionError) {
                res.status(400).json({
                    error: "Subscription error",
                    message: error.message
                });
            } else if (error instanceof StorageNotFoundError) {
                res.status(404).json({ error: "Generation ID not found" });
            } else if (error instanceof StorageError) {
                res.status(500).json({
                    error: "Storage operation failed",
                    message: error.message
                });
            } else {
                next(error);
            }
        }
    };
};

export async function initializeVideoRoutes(): Promise<Router> {
    videoService = new VideoGenerationService();
    youtubeService = new YouTubeService();
    subscriptionService = new SubscriptionService();

    // Initialize subscription service
    await subscriptionService.initialize();

    const router: Router = express.Router();

    // Reset all storage/DB data (all generations). Set ALLOW_STORAGE_RESET=true to enable.
    router.post("/admin/reset-storage", withStorageError(async (req: Request, res: Response) => {
        if (process.env.ALLOW_STORAGE_RESET !== 'true') {
            return res.status(403).json({
                error: "Storage reset is disabled",
                message: "Set ALLOW_STORAGE_RESET=true to enable this endpoint"
            });
        }
        const storage = StorageFactory.getInstance();
        try {
            await storage.clearAll();
            res.json({
                success: true,
                message: "All storage data has been reset"
            });
        } catch (error: any) {
            console.error("Error resetting storage:", error);
            res.status(500).json({
                error: "Failed to reset storage",
                message: error.message
            });
        }
    }));

    // Detailed health check endpoint
    router.get("/health/detailed", async (req: Request, res: Response) => {
        const isVideoServiceHealthy = !!videoService;
        const isYouTubeServiceHealthy = !!youtubeService;
        const isSubscriptionServiceHealthy = !!subscriptionService && await subscriptionService.isHealthy();

        const isHealthy = isVideoServiceHealthy && isYouTubeServiceHealthy && isSubscriptionServiceHealthy;

        if (isHealthy) {
            res.status(200).json({
                status: "ok",
                timestamp: new Date().toISOString(),
                services: {
                    videoService: isVideoServiceHealthy ? "initialized" : "not initialized",
                    youtubeService: isYouTubeServiceHealthy ? "initialized" : "not initialized",
                    subscriptionService: isSubscriptionServiceHealthy ? "initialized" : "not initialized"
                }
            });
        } else {
            res.status(503).json({
                status: "degraded",
                timestamp: new Date().toISOString(),
                services: {
                    videoService: isVideoServiceHealthy ? "initialized" : "not initialized",
                    youtubeService: isYouTubeServiceHealthy ? "initialized" : "not initialized",
                    subscriptionService: isSubscriptionServiceHealthy ? "initialized" : "not initialized"
                }
            });
        }
    });

    // Initialize generation - requires authentication
    router.post("/generation/init", authenticateUser, withStorageError(async (req: Request, res: Response) => {
        if (!videoService || !subscriptionService) {
            return res.status(503).json({ error: "Service not initialized" });
        }

        const {
            prompt,
            isInstantVideo = true,
            options = {
                useFancyCaptions: false,
                languageCode: "en-US",
                voiceId: "Gregory",
                aspectRatio: "16:9",
                twoPhaseScriptGeneration: false
            },
        } = req.body;

        if (!prompt || prompt.trim().length === 0) {
            return res.status(400).json({ error: "A prompt is required" });
        }

        // Check subscription and consume credit before proceeding
        await subscriptionService.checkAndConsumeCredit(req.user!.userId);

        // Generate ID with user context
        const generationId = `gen_${Date.now()}_${req.user!.userId}_${Math.random().toString(36).substr(2, 9)}`;
        const storage = StorageFactory.getInstance();

        const state: GenerationState = {
            generationId,
            isInstantVideo,
            userId: req.user!.userId, // Add user ID to state
            initialParams: {
                prompt,
                options: {
                    ...options
                }
            }
        };

        await storage.save(state);
        res.json({
            generationId,
        });
    }));

    /**
     * @route POST /generation/:generationId/script
     * @group Video Generation - Steps
     * @summary Generates or updates the script for a video generation task.
     * @param {string} generationId.path.required - The ID of the generation task.
     * @body {object} [body] - Optional.
     * @body {string} [userScript] - Optional. A user-provided script to use. If provided, this script will replace any existing script for this generation.
     * @returns {object} 200 - An object containing the generated script content and its mood.
     * @returns {Error} 400 - Invalid request (e.g., generation ID not found, or other issues).
     * @returns {Error} 503 - Service not initialized.
     */
    router.post("/generation/:generationId/script", authenticateUser, withStorageError(async (req: Request, res: Response) => {
        if (!videoService) {
            return res.status(503).json({ error: "Service not initialized" });
        }

        const { generationId } = req.params;
        const { userScript, memories } = req.body as { userScript?: string; memories?: string[] };
        const storage = StorageFactory.getInstance();

        const state = await storage.getUserGeneration(req.user!.userId, generationId);

        if (!state) {
            return res.status(404).json({ error: "Generation ID not found" });
        }

        const { prompt, options } = state.initialParams;

        if (!options?.languageCode || !options?.voiceId) {
            return res.status(400).json({ error: "Language and voice ID are required" });
        }

        const { script, mood } = await videoService.generateScript(
            generationId,
            prompt,
            options?.languageCode,
            options?.twoPhaseScriptGeneration,
            { userScript, memories: Array.isArray(memories) ? memories : undefined },
        );

        res.json({ script, mood });
    }));

    /**
     * @route POST /generation/:generationId/audio
     * @group Video Generation - Steps
     * @summary Generates or updates the audio for a video generation task.
     * @param {string} generationId.path.required - The ID of the generation task.
     * @body {object} [body] - Optional.
     * @body {string} [editedScript] - Optional. A script specifically for audio generation. If provided, this script will be used for generating audio instead of the main project script.
     * @returns {object} 200 - An object containing the audio file URL, speech marks, and background music URL.
     * @returns {Error} 400 - Invalid request (e.g., script not generated yet).
     * @returns {Error} 404 - Generation ID not found.
     * @returns {Error} 503 - Service not initialized.
     */
    router.post("/generation/:generationId/audio", authenticateUser, withStorageError(async (req: Request, res: Response) => {
        if (!videoService) {
            return res.status(503).json({ error: "Service not initialized" });
        }

        const { generationId } = req.params;
        const { editedScript, memories } = req.body as { editedScript?: string; memories?: string[] };
        const storage = StorageFactory.getInstance();

        const state = await storage.getUserGeneration(req.user!.userId, generationId);
        if (!state) {
            return res.status(404).json({ error: "Generation ID not found" });
        }

        if (!state.initialParams?.options?.languageCode || !state.initialParams?.options?.voiceId) {
            return res.status(400).json({ error: "Language and voice ID are required" });
        }

        if (!state.script) {
            return res.status(400).json({ error: "Script must be generated first" });
        }

        const { audioFile, speechMarks, backgroundMusic } = await videoService.generateAudio(
            generationId,
            req.user?.userId!,
            state.script.content, // Original project script
            state.script.mood,
            state.initialParams.options.languageCode,
            state.initialParams.options.voiceId,
            editedScript, // Optional edited script for audio
            Array.isArray(memories) ? memories : undefined
        );

        // Return presigned URLs so the browser can play audio (S3 objects are private)
        const [playableAudioUrl, playableMusicUrl] = await Promise.all([
            generatePresignedUrl(audioFile),
            generatePresignedUrl(backgroundMusic)
        ]);
        res.json({ audioFile: playableAudioUrl, speechMarks, backgroundMusic: playableMusicUrl });
    }));

    /**
     * @route POST /generation/:generationId/keywords
     * @group Video Generation - Steps
     * @summary Extracts keywords or uses user-provided clip timings for a video generation task.
     * @param {string} generationId.path.required - The ID of the generation task.
     * @body {object} [body] - Optional.
     * @body {Array<ClipTiming>} [userClipTimings] - Optional. An array of user-defined clip timings. If provided, these will be used instead of automatic keyword extraction.
     * @returns {object} 200 - An object containing the array of clip timings.
     * @returns {Error} 400 - Invalid request (e.g., script or speech marks not generated yet).
     * @returns {Error} 404 - Generation ID not found.
     * @returns {Error} 503 - Service not initialized.
     */
    router.post("/generation/:generationId/keywords", authenticateUser, withStorageError(async (req: Request, res: Response) => {
        if (!videoService) {
            return res.status(503).json({ error: "Service not initialized" });
        }

        const { generationId } = req.params;
        const { userClipTimings } = req.body; // Correct: userClipTimings for keywords route
        const storage = StorageFactory.getInstance();

        const state = await storage.getUserGeneration(req.user!.userId, generationId);
        if (!state) {
            return res.status(404).json({ error: "Generation ID not found" });
        }

        if (!state.script) {
            return res.status(400).json({ error: "Script must be generated first" });
        }

        if (!state.audio?.speechMarks) { // Check for audio object and speechMarks
            return res.status(400).json({ error: "Speech marks must be generated first" });
        }

        // Determine which script content to use for keyword extraction.
        // If audio was generated from an edited script, use that for keyword context.
        // Otherwise, use the main project script.
        const scriptForKeywords = (state.audio && state.audio.scriptSource === 'custom_for_audio' && state.audio.scriptContentUsed)
            ? state.audio.scriptContentUsed
            : state.script.content;

        const clipTimings = await videoService.extractKeywords(
            generationId,
            state.audio.speechMarks,
            scriptForKeywords,
            userClipTimings // Pass user-provided clip timings
        );

        res.json({ clipTimings });
    }));

    /**
     * @route POST /generation/:generationId/clips
     * @group Video Generation - Steps
     * @summary Processes and creates video clips for a video generation task.
     * @param {string} generationId.path.required - The ID of the generation task.
     * @body {object} [body] - Optional.
     * @body {Array<ClipTiming>} [overrideClipTimings] - Optional. An array of clip timings to override the ones from the keyword extraction step. These will be used for fetching and processing video clips.
     * @returns {object} 200 - An object containing an array of processed clip objects.
     * @returns {Error} 400 - Invalid request (e.g., keywords not extracted or script content unavailable).
     * @returns {Error} 404 - Generation ID not found.
     * @returns {Error} 503 - Service not initialized.
     */
    router.post("/generation/:generationId/clips", authenticateUser, withStorageError(async (req: Request, res: Response) => {
        if (!videoService) {
            return res.status(503).json({ error: "Service not initialized" });
        }

        const { generationId } = req.params;
        const storage = StorageFactory.getInstance();

        const state = await storage.getUserGeneration(req.user!.userId, generationId);
        if (!state) {
            return res.status(404).json({ error: "Generation ID not found" });
        }

        if (!state.keywords) {
            return res.status(400).json({ error: "Keywords must be extracted first" });
        }

        if (!state.script && !(state.audio && state.audio.scriptContentUsed)) {
            return res.status(400).json({ error: "Script content is not available for clip processing context." });
        }

        // Determine the script content to be used as context for clip generation
        let scriptForContext = state.script?.content || ""; // Default to main script content
        if (state.audio && state.audio.scriptSource === 'custom_for_audio' && state.audio.scriptContentUsed) {
            scriptForContext = state.audio.scriptContentUsed; // Override if audio used a specific script
        }

        const { overrideClipTimings } = req.body; // Extract overrideClipTimings

        const processedClips = await videoService.processClips(
            generationId,
            req.user!.userId,
            state.keywords.clipTimings, // baseClipTimings from keywords step
            state.initialParams.options.aspectRatio,
            scriptForContext, // The determined script content for context
            overrideClipTimings // Optional override timings
        );

        res.json({
            processedClips: processedClips.map(clip => ({
                ...clip,
                clip: generatePresignedUrl(clip.clip)
            }))
        });
    }));

    // Concatenate clips
    router.post("/generation/:generationId/concatenate", authenticateUser, withStorageError(async (req: Request, res: Response) => {
        if (!videoService) {
            return res.status(503).json({ error: "Service not initialized" });
        }

        const { generationId } = req.params;
        const storage = StorageFactory.getInstance();

        const state = await storage.getUserGeneration(req.user!.userId, generationId);
        if (!state) {
            return res.status(404).json({ error: "Generation ID not found" });
        }

        if (!state.clips) {
            return res.status(400).json({ error: "Clips must be created first" });
        }

        if (!state.audio) {
            return res.status(400).json({ error: "Audio must be generated first" });
        }

        const finalVideo = await videoService.concatenateClips(
            generationId,
            req.user!.userId,
            state.clips.processedClips,
            state.audio.audioUrl,
            state.audio.backgroundMusicUrl,
            state.initialParams.options.aspectRatio
        );

        res.json({ videoUrl: await generatePresignedUrl(finalVideo) });
    }));

    // Apply subtitles
    router.post("/generation/:generationId/video/subtitles", authenticateUser, withStorageError(async (req: Request, res: Response) => {
        if (!videoService) {
            return res.status(503).json({ error: "Service not initialized" });
        }

        const { generationId } = req.params;
        const { memories } = (req.body || {}) as { memories?: string[] };
        const storage = StorageFactory.getInstance();

        const state = await storage.getUserGeneration(req.user!.userId, generationId);
        if (!state) {
            return res.status(404).json({ error: "Generation ID not found" });
        }

        if (!state.baseVideo) {
            return res.status(400).json({ error: "Base video must be generated first" });
        }

        if (!state.audio) {
            return res.status(400).json({ error: "Audio must be generated first" });
        }

        if (!state.initialParams.options.languageCode) {
            return res.status(400).json({ error: "Language code is required" });
        }

        const finalVideoUrl = await videoService.applySubtitles(
            generationId,
            req.user!.userId,
            state.baseVideo.mergedVideoUrl,
            state.audio.speechMarks,
            state.initialParams.options.aspectRatio,
            state.initialParams.options.languageCode,
            Array.isArray(memories) ? memories : undefined
        );

        res.json({ finalVideoUrl: await generatePresignedUrl(finalVideoUrl) });
    }));

    // Upload video to YouTube
    router.post("/generation/:generationId/youtube-upload", authenticateUser, withStorageError(async (req: Request, res: Response) => {
        if (!videoService || !youtubeService) {
            return res.status(503).json({ error: "Service not initialized" });
        }

        const { generationId } = req.params;
        const { oauthToken, title, description, tags, privacyStatus = 'private' } = req.body as YouTubeUploadRequest;

        if (!oauthToken) {
            return res.status(400).json({ error: "YouTube OAuth token is required" });
        }

        const storage = StorageFactory.getInstance();
        const state = await storage.getUserGeneration(req.user!.userId, generationId);

        if (!state) {
            return res.status(404).json({ error: "Generation ID not found" });
        }

        if (!state.finalVideo?.videoUrl) {
            return res.status(400).json({ error: "Final video must be generated first" });
        }

        try {
            // Initialize the YouTube service with the user's OAuth token
            youtubeService.initialize(oauthToken);

            // Set video title from state if not provided
            const videoTitle = title || `Generated Video: ${state.initialParams.prompt.substring(0, 50)}`;

            // Set video description from state if not provided
            const videoDescription = description ||
                `Generated video from prompt: ${state.initialParams.prompt}\n\nGenerated with Video Gennie`;

            // Upload the video
            const uploadResult = await youtubeService.uploadVideo(
                state.finalVideo.videoUrl,
                videoTitle,
                videoDescription,
                tags ? (typeof tags === 'string' ? tags.split(',') : tags) : [],
                privacyStatus as 'public' | 'unlisted' | 'private'
            );

            // Update the state with YouTube info
            await storage.update(generationId, {
                youtube: {
                    videoId: uploadResult.id,
                    videoUrl: uploadResult.url,
                    uploadDate: new Date().toISOString()
                }
            });

            const response: YouTubeUploadResponse = {
                success: true,
                videoId: uploadResult.id,
                url: uploadResult.url
            };

            res.json(response);
        } catch (error: any) {
            console.error("Error uploading to YouTube:", error);
            res.status(500).json({
                error: "Failed to upload to YouTube",
                message: error.message
            });
        }
    }));

    // Direct YouTube upload for any video file
    router.post("/youtube-upload", authenticateUser, async (req: Request, res: Response) => {
        if (!youtubeService) {
            return res.status(503).json({ error: "YouTube service not initialized" });
        }

        const { oauthToken, videoPath, title, description, tags, privacyStatus = 'private' } = req.body as YouTubeDirectUploadRequest;

        if (!oauthToken) {
            return res.status(400).json({ error: "YouTube OAuth token is required" });
        }

        if (!videoPath) {
            return res.status(400).json({ error: "Video path is required" });
        }

        if (!fs.existsSync(videoPath)) {
            return res.status(404).json({ error: "Video file not found" });
        }

        try {
            // Initialize the YouTube service with the user's OAuth token
            youtubeService.initialize(oauthToken);

            // Upload the video
            const uploadResult = await youtubeService.uploadVideo(
                videoPath,
                title || "Uploaded Video",
                description || "Video uploaded via Video Gennie",
                tags ? (typeof tags === 'string' ? tags.split(',') : tags) : [],
                privacyStatus as 'public' | 'unlisted' | 'private'
            );

            const response: YouTubeUploadResponse = {
                success: true,
                videoId: uploadResult.id,
                url: uploadResult.url
            };

            res.json(response);
        } catch (error: any) {
            console.error("Error uploading to YouTube:", error);
            res.status(500).json({
                error: "Failed to upload to YouTube",
                message: error.message
            });
        }
    });

    // Endpoint to accept user prompt and generate video
    router.post("/generate-video", authenticateUser, withStorageError(async (req: Request, res: Response) => {
        if (!videoService) {
            return res.status(503).json({ error: "Service not initialized" });
        }

        let generationId = req.body.generationId;
        let generationState: GenerationState | null = null;
        if (generationId) {
            const storage = StorageFactory.getInstance();
            generationState = await storage.getUserGeneration(req.user!.userId, generationId);
            if (!generationState) {
                return res.status(400).json({ error: "Generation ID not found" });
            }
        } else {
            return res.status(400).json({ error: "Generation ID is required" });
        }


        // Generate complete video using the service
        const finalVideoUrl = await videoService.generateCompleteVideo(
            generationId,
            req.user!.userId,
            generationState!
        );

        // Serve the final video file to the client
        console.log("Serving final video file to client...");
        res.json({ finalVideoUrl: await generatePresignedUrl(finalVideoUrl) });
    }));

    // Anonymous user ID when no auth (public app)
    const ANONYMOUS_USER_ID = 'anonymous-public-user';

    // Get user's generation history (optional auth for public app)
    router.get("/history", optionalAuth, withStorageError(async (req: Request, res: Response) => {
        const storage = StorageFactory.getInstance();
        const userId = req.user?.userId ?? ANONYMOUS_USER_ID;
        // Parse query parameters
        const limit = parseInt(req.query.limit as string) || 20;
        const lastEvaluatedKey = req.query.lastKey as string;
        const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

        // Validate limit
        if (limit < 1 || limit > 100) {
            return res.status(400).json({
                error: "Invalid limit. Must be between 1 and 100"
            });
        }
        try {
            const result = await storage.getUserGenerations(userId, {
                limit,
                lastEvaluatedKey,
                sortOrder
            });
            res.json({
                success: true,
                generations: result.items,
                pagination: {
                    hasMore: result.hasMore,
                    lastEvaluatedKey: result.lastEvaluatedKey,
                    totalCount: result.totalCount
                }
            });
        } catch (error: any) {
            console.error("Error fetching user generations:", error);
            res.status(500).json({
                error: "Failed to fetch generation history",
                message: error.message
            });
        }
    }));

    // Clear all generation history for the user (optional auth for public app)
    router.delete("/history", optionalAuth, withStorageError(async (req: Request, res: Response) => {
        const storage = StorageFactory.getInstance();
        const userId = req.user?.userId ?? ANONYMOUS_USER_ID;

        try {
            let lastKey: string | undefined;
            let deletedCount = 0;

            do {
                const result = await storage.getUserGenerations(userId, {
                    limit: 100,
                    lastEvaluatedKey: lastKey,
                    sortOrder: 'desc'
                });

                for (const gen of result.items) {
                    await storage.delete(gen.generationId);
                    deletedCount++;
                }

                lastKey = result.lastEvaluatedKey;
            } while (lastKey);

            res.json({
                success: true,
                message: "All generation history cleared",
                deletedCount
            });
        } catch (error: any) {
            console.error("Error clearing user generations:", error);
            res.status(500).json({
                error: "Failed to clear generation history",
                message: error.message
            });
        }
    }));

    // Get specific generation details for the user (optional auth for public app)
    router.get("/history/:generationId", optionalAuth, withStorageError(async (req: Request, res: Response) => {
        const storage = StorageFactory.getInstance();
        const userId = req.user?.userId ?? ANONYMOUS_USER_ID;
        const { generationId } = req.params;

        if (!generationId) {
            return res.status(400).json({ error: "Generation ID is required" });
        }

        try {
            const generation = await storage.getUserGeneration(userId, generationId);
            // presign the audio
            if (generation?.audio?.audioUrl) {
                generation.audio.audioUrl = await generatePresignedUrl(generation.audio.audioUrl);
            }
            // presign the background music
            if (generation?.audio?.backgroundMusicUrl) {
                generation.audio.backgroundMusicUrl = await generatePresignedUrl(generation.audio.backgroundMusicUrl);
            }

            // presign clips
            if (generation?.clips?.processedClips) {
                for (const clip of generation.clips.processedClips) {
                    clip.clip = await generatePresignedUrl(clip.clip);
                }
            }
            // presign the base video
            if (generation?.baseVideo?.mergedVideoUrl) {
                generation.baseVideo.mergedVideoUrl = await generatePresignedUrl(generation.baseVideo.mergedVideoUrl);
            }




            if (!generation) {
                return res.status(404).json({
                    error: "Generation not found or access denied"
                });
            }

            res.json({
                success: true,
                generation
            });
        } catch (error: any) {
            console.error("Error fetching generation details:", error);
            res.status(500).json({
                error: "Failed to fetch generation details",
                message: error.message
            });
        }
    }));

    // Get user subscription status
    router.get("/subscription", authenticateUser, withStorageError(async (req: Request, res: Response) => {
        if (!subscriptionService) {
            return res.status(503).json({ error: "Subscription service not initialized" });
        }

        const userId = req.user!.userId;

        try {
            const subscription = await subscriptionService.getUserSubscription(userId);

            if (!subscription) {
                // User doesn't have a subscription yet
                return res.json({
                    success: true,
                    subscription: null,
                    message: "No subscription found. A new subscription will be created on first generation."
                });
            }

            // Check if subscription is expired
            const isExpired = subscriptionService.isSubscriptionExpired(subscription.expiredAt);

            res.json({
                success: true,
                subscription: {
                    ...subscription,
                    isExpired,
                    timeUntilRenewal: isExpired ? null : new Date(subscription.expiredAt).getTime() - Date.now()
                }
            });
        } catch (error: any) {
            console.error("Error fetching subscription:", error);
            res.status(500).json({
                error: "Failed to fetch subscription details",
                message: error.message
            });
        }
    }));

    return router;
} 