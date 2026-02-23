import axios from "axios";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import { v4 as uuidv4 } from "uuid";
import { PEXELS_API_KEY, GOOGLE_API_KEY, GOOGLE_SEARCH_ENGINE_ID, modelsToUse } from "../config";
import { PexelsSearchResponse, VideoMetadata } from "../types";
import { createSequencedTempFilePath, ensureOutputDirExists } from "../utils";
import path from "path";
import { openai } from "../config";
import { logVideoSelection } from "../utils/llmLogger";
import { logSearchFailure } from "../utils/searchAuditLogger";
import {
    executeFFmpegAsync,
    ffProbeAsync
} from "../utils/ffmpegPromises";
import {
    createAudioMixingFilter,
    getAspectRatioDimensions,
} from "../utils/ffmpegUtils";
import { ClipTiming } from "../types/generation";
import AWS from "aws-sdk";

// Cache for storing search results to avoid repeated API calls
const searchResultsCache: Record<string, any[]> = {};

// Directory for caching downloaded videos
const CACHE_DIR = path.join(process.cwd(), 'cache');

// Flag to enable/disable LLM-based video selection
const USE_LLM_SELECTION = true;

// Flag to toggle between Pexels and Google Search APIs
const USE_GOOGLE_SEARCH = process.env.USE_GOOGLE_SEARCH === 'true';

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
    try {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
    } catch (err) {
        console.error("Failed to create cache directory:", err);
    }
}

// Interface for video with metadata for LLM selection
interface VideoWithMetadata {
    id: string;
    title: string;
    description: string;
    tags: string[];
    url: string;
    duration: number;
    videoUrl: string;
    width: number;
    height: number;
    quality: string;
    aspectRatio: number;
    originalObject: any; // The original video object
}

const selectedVids: string[] = [];

/**
 * Use LLM to select the best video based on metadata and script context
 * @param scriptSegment The segment of the script being visualized
 * @param keywords Keywords extracted for this segment
 * @param candidateVideos Array of video candidates with metadata
 * @param fullScriptContext The entire script context for better context awareness
 * @returns The selected best video
 */
async function selectBestVideoWithLLM(
    scriptSegment: string,
    candidateVideos: VideoWithMetadata[],
    fullScriptContext: string = "",
    selectedVideos: string[] = []
): Promise<VideoWithMetadata | null> {
    const uniqueCandidateVideos = candidateVideos.filter((video, index, self) => {
        return !selectedVids.includes(video.title);
    });
    if (uniqueCandidateVideos.length === 0) return null;
    if (uniqueCandidateVideos.length === 1) return uniqueCandidateVideos[0];

    try {
        // Format video metadata for LLM
        const videoOptions = uniqueCandidateVideos.map((video, index) =>
            `Video ${index + 1}: ${video.title || 'Untitled'}. ` +
            `Description: ${video.description || 'No description'}. ` +
            `Tags: ${video.tags.join(', ') || 'No tags'}. ` +
            `Duration: ${video.duration}s. ` +
            `Resolution: ${video.width}x${video.height}. ` +
            `Quality: ${video.quality}. ` +
            `Aspect Ratio: ${video.aspectRatio.toFixed(2)}.`
        ).join('\n\n');

        // Prepare context for the LLM
        const contextForPrompt = fullScriptContext
            ? `FULL SCRIPT CONTEXT:
-----------------------------------------
${fullScriptContext}
-----------------------------------------

CURRENT SEGMENT BEING VISUALIZED: 
"${scriptSegment}"

Your task is to select a video that not only matches this current segment, but also fits coherently within the overall narrative arc of the full script.
`
            : `Script segment being visualized: "${scriptSegment}"`;

        // Prompt the LLM
        const response = await openai.chat.completions.create({
            model: modelsToUse.selectVideoWithLLm,
            messages: [
                {
                    role: "system",
                    content: `You are a professional cinematographer and video editor with expertise in selecting the perfect stock footage for video productions.
                    Your task is to select the most visually relevant and engaging video clip based on script context and keywords.
                    
                    When evaluating video options, consider:
                    1. Semantic relevance to the current script segment being visualized
                    3. Visual quality and professional appearance
                    4. for selecting photos/videos, choose options that are downloadable, eg do not select anything from instagram
                    4. Emotional tone and mood matching
                    5. Composition and cinematographic value
                    6. Consistency with the overall narrative flow and themes of the full script
                    7. Visual continuity with previous and upcoming content in the full script
                    8. How well the footage supports the story being told in its entirety`
                },
                {
                    role: "user",
                    content: `${contextForPrompt}
                    
                    Available videos:
                    ${videoOptions}
                    
                    Analyze each option and return ONLY the video number (1-${candidateVideos.length}) that best matches the script segment, fits within the overall narrative of the full script, and aligns with the keywords.
                    DO NOT include any explanation - just return the single number of the best video.`
                }
            ],
            temperature: 0.3,
            max_tokens: 200
        });

        // Parse response to get selected video index
        const content = response.choices[0]?.message?.content?.trim();
        console.log(`LLM selection response: ${content}`);

        if (!content) {
            console.warn("Empty response from LLM video selection");
            return candidateVideos[0]; // Fallback to first video
        }

        // Extract number from response (handling cases where LLM might output "Video 3" instead of just "3")
        const numberMatch = content.match(/\d+/);
        if (numberMatch) {
            const selectedIndex = parseInt(numberMatch[0]) - 1;
            if (selectedIndex >= 0 && selectedIndex < candidateVideos.length) {
                console.log(`LLM selected video ${selectedIndex + 1}: ${candidateVideos[selectedIndex].title || 'Untitled'}`);

                // Log the video selection inputs and outputs
                logVideoSelection(
                    scriptSegment,
                    candidateVideos,
                    fullScriptContext,
                    candidateVideos[selectedIndex]
                );
                selectedVids.push(candidateVideos[selectedIndex].title);
                return candidateVideos[selectedIndex];
            }
        }

        // If parsing failed, fallback to first video
        console.warn(`Could not parse LLM selection response: "${content}", using first video`);

        // Log the fallback selection
        logVideoSelection(
            scriptSegment,
            candidateVideos,
            fullScriptContext,
            candidateVideos[0]
        );
        selectedVids.push(candidateVideos[0].title);
        return candidateVideos[0];
    } catch (error) {
        console.error("Error using LLM to select best video:", error);
        // Fallback to first video on error
        const fallbackVideo = candidateVideos.length > 0 ? candidateVideos[0] : null;

        if (fallbackVideo) {
            // Log the error case fallback
            logVideoSelection(
                scriptSegment,
                candidateVideos,
                fullScriptContext,
                fallbackVideo
            );
        }

        return fallbackVideo;
    }
}

/**
 * Search and download a photo from Google or Pexels API and create a video with visual effects
 */
async function searchAndDownloadVideoFromWeb(
    keyPhrase: string,
    targetAspectRatio: number,
    maxRetries: number = 3,
): Promise<string | null> {
    // Use Google Search if enabled, otherwise use Pexels
    if (USE_GOOGLE_SEARCH) {
        return searchAndDownloadPhotoFromGoogle(keyPhrase, targetAspectRatio);
    } else {
        return searchAndDownloadPhotoFromPexels(keyPhrase, targetAspectRatio, maxRetries);
    }
}

/**
 * Download a photo from URL to a local file
 * Validates that the downloaded file is actually an image
 */
async function downloadPhoto(photoUrl: string, outputPath: string): Promise<boolean> {
    try {
        const writer = fs.createWriteStream(outputPath);
        const response = await axios({
            url: photoUrl,
            method: "GET",
            responseType: "stream",
            timeout: 30000, // 30-second timeout
        });

        // Check content type before attempting to download
        const contentType = response.headers['content-type'];
        if (!contentType || !contentType.startsWith('image/')) {
            console.warn(`URL does not return an image. Content-Type: ${contentType}`);
            writer.close();
            return false;
        }

        response.data.pipe(writer);

        await new Promise<void>((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
        });

        // Verify the file is actually an image by trying to probe it with ffmpeg
        try {
            // Check if file is empty
            const stats = fs.statSync(outputPath);
            if (stats.size < 100) { // Extremely small files are likely not valid images
                console.warn("Downloaded file is too small to be a valid image");
                return false;
            }

            // Use ffprobe to check if the file is a valid image
            await ffProbeAsync(outputPath);
            return true;
        } catch (probeError) {
            console.warn("Downloaded file is not a valid image:", probeError);
            return false;
        }
    } catch (error) {
        console.error("Error downloading photo:", photoUrl);
        return false;
    }
}

async function downloadAndCreateVideoFromPhoto(photoUrl: string, targetAspectRatio: number, cachedFilePath: string): Promise<string | null> {
    const photoFile = `temp_photo_${uuidv4()}.jpg`;

    console.log(`Trying to download image: ${photoUrl}`);

    // Download the photo and check if it's valid
    let downloadSuccess = await downloadPhoto(photoUrl, photoFile);

    if (downloadSuccess) {
        console.log(`Successfully downloaded valid image: ${photoUrl}`);

        // Create a video from the photo with effects
        const videoPath = await createVideoFromPhoto(photoFile, targetAspectRatio, cachedFilePath);
        return videoPath;
    } else {
        console.log(`Download or validation failed for image: ${photoUrl}`);
        return null;
    }
}

/**
 * Search and download a photo from Google Custom Search API
 */
async function searchAndDownloadPhotoFromGoogle(
    keyPhrase: string,
    targetAspectRatio: number,
    maxRetries: number = 1,
): Promise<string | null> {
    // Check if API keys are available
    if (!GOOGLE_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
        const errorReason = "GOOGLE_API_KEY or GOOGLE_SEARCH_ENGINE_ID not found in environment variables";
        console.error(errorReason);

        // Log the failure
        logSearchFailure({
            timestamp: new Date().toISOString(),
            query: keyPhrase,
            source: 'Google',
            searchType: 'image',
            reason: errorReason,
            targetAspectRatio
        });

        return null;
    }

    // Check cache for this key phrase
    const cacheKey = `google_photo_${keyPhrase}_${targetAspectRatio.toFixed(2)}`;
    const cachedFilePath = path.join(CACHE_DIR, `${cacheKey.replace(/\s+/g, '_').replace(/[^\w]/g, '')}.mp4`);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Return cached video if it exists and is valid
    // if (fs.existsSync(cachedFilePath)) {
    //     console.log(`Checking cached Google photo video for "${keyPhrase}"`);
    //     try {
    //         await ffProbeAsync(cachedFilePath);
    //         console.log(`Using cached Google photo video for "${keyPhrase}"`);
    //         return cachedFilePath;
    //     } catch (error) {
    //         console.warn(`Found corrupted cached file for "${keyPhrase}", will regenerate`);
    //         try {
    //             fs.unlinkSync(cachedFilePath);
    //         } catch (unlinkErr) {
    //             console.error(`Error removing corrupted cache file: ${unlinkErr}`);
    //         }
    //     }
    // }

    // Determine image size based on target aspect ratio
    const imageSize = "xxlarge";
    const imageType = "photo";

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            console.log(`Searching for Google images with query: ${keyPhrase} (attempt ${attempt + 1})`);

            // Build the Google Custom Search API URL
            const apiUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(keyPhrase)}&searchType=image&imgSize=${imageSize}&imgType=${imageType}&num=10`;

            // Use a timeout to prevent hanging requests
            const response = await axios.get(
                apiUrl,
                {
                    timeout: 10000 // 10 second timeout
                }
            );

            const items = response.data.items;

            if (items && items.length > 0) {
                console.log(`Found ${items.length} Google images for query "${keyPhrase}"`);

                // Filter for high-quality images with appropriate aspect ratio
                const validImages = items;

                if (validImages.length > 0) {
                    // Instead of immediately selecting one image, try each one until we find one that works
                    let videoPath = null;
                    // sort images by closeness to target aspect ratio
                    const sortedImages = validImages.sort((a: any, b: any) => {
                        const aspectRatioA = a.image.width / a.image.height;
                        const aspectRatioB = b.image.width / b.image.height;
                        return Math.abs(aspectRatioA - targetAspectRatio) - Math.abs(aspectRatioB - targetAspectRatio);
                    });

                    // add aspect ratio to each image
                    sortedImages.forEach((image: any) => {
                        image.aspectRatio = image.image.width / image.image.height;
                    });

                    // Process all images sequentially until one works
                    if (!videoPath) {
                        for (const image of sortedImages) {
                            try {
                                videoPath = await downloadAndCreateVideoFromPhoto(image.link, targetAspectRatio, cachedFilePath);
                                if (videoPath) {
                                    console.log(`Successfully downloaded and created video from iteration: ${image.link}`);
                                    break;
                                }
                            } catch (imageError) {
                                console.error(`Error processing image ${image.title || 'Untitled'}:`, imageError);
                                // Continue to next image
                            }
                        }
                    }

                    // Clean up the photo file regardless of success/failure
                    // if (fs.existsSync(photoFile)) {
                    //     fs.unlinkSync(photoFile);
                    // }

                    if (videoPath) {
                        return videoPath;
                    } else {
                        const errorReason = "All images failed to download or validate";
                        console.log(`${errorReason} for Google query: ${keyPhrase}`);

                        // Log the failure
                        logSearchFailure({
                            timestamp: new Date().toISOString(),
                            query: keyPhrase,
                            source: 'Google',
                            searchType: 'image',
                            reason: errorReason,
                            attemptNumber: attempt + 1,
                            targetAspectRatio
                        });
                    }
                } else {
                    const errorReason = "No images with appropriate aspect ratio found";
                    console.log(`${errorReason} for Google query: ${keyPhrase}`);

                    // Log the failure
                    logSearchFailure({
                        timestamp: new Date().toISOString(),
                        query: keyPhrase,
                        source: 'Google',
                        searchType: 'image',
                        reason: errorReason,
                        attemptNumber: attempt + 1,
                        targetAspectRatio,
                        orientation: imageSize
                    });
                }
            } else {
                const errorReason = "No images found";
                console.log(`${errorReason} for Google query: ${keyPhrase}`);

                // Log the failure
                logSearchFailure({
                    timestamp: new Date().toISOString(),
                    query: keyPhrase,
                    source: 'Google',
                    searchType: 'image',
                    reason: errorReason,
                    attemptNumber: attempt + 1,
                    targetAspectRatio,
                    orientation: imageSize
                });
            }
        } catch (error) {
            const errorReason = error instanceof Error ? error.message : String(error);
            console.error(
                `Error searching for Google images with query "${keyPhrase}":`,
                errorReason
            );

            // Log the failure
            logSearchFailure({
                timestamp: new Date().toISOString(),
                query: keyPhrase,
                source: 'Google',
                searchType: 'image',
                reason: errorReason,
                attemptNumber: attempt + 1,
                targetAspectRatio
            });
        }
    }

    const finalErrorReason = `Exhausted all ${maxRetries} attempts`;
    console.log(`Could not find suitable Google image for: ${keyPhrase} - ${finalErrorReason}`);

    // Log the final failure
    logSearchFailure({
        timestamp: new Date().toISOString(),
        query: keyPhrase,
        source: 'Google',
        searchType: 'image',
        reason: finalErrorReason,
        targetAspectRatio
    });

    return null;
}

/**
 * Search and download a photo from Pexels API
 */
async function searchAndDownloadPhotoFromPexels(
    keyPhrase: string,
    targetAspectRatio: number,
    maxRetries: number = 3,
): Promise<string | null> {
    const headers = {
        Authorization: PEXELS_API_KEY || "",
    };

    // Check if API key is available
    if (!PEXELS_API_KEY) {
        const errorReason = "PEXELS_API_KEY not found in environment variables";
        console.error(errorReason);

        // Log the failure
        logSearchFailure({
            timestamp: new Date().toISOString(),
            query: keyPhrase,
            source: 'Pexels',
            searchType: 'image',
            reason: errorReason,
            targetAspectRatio
        });

        return null;
    }

    // Check cache for this key phrase
    const cacheKey = `pexels_photo_${keyPhrase}_${targetAspectRatio.toFixed(2)}`;
    const cachedFilePath = path.join(CACHE_DIR, `${cacheKey.replace(/\s+/g, '_').replace(/[^\w]/g, '')}.mp4`);

    // Return cached video if it exists and is valid
    if (fs.existsSync(cachedFilePath)) {
        console.log(`Checking cached Pexels photo video for "${keyPhrase}"`);
        // Validate the cached file using ffprobe
        try {
            await ffProbeAsync(cachedFilePath);
            console.log(`Using cached Pexels photo video for "${keyPhrase}"`);
            return cachedFilePath;
        } catch (error) {
            console.warn(`Found corrupted cached file for "${keyPhrase}", will regenerate`);
            // Delete the corrupted file
            try {
                fs.unlinkSync(cachedFilePath);
            } catch (unlinkErr) {
                console.error(`Error removing corrupted cache file: ${unlinkErr}`);
            }
        }
    }

    // Randomize orientation preference to increase variety
    const orientationPreference = targetAspectRatio > 1 ? "landscape" : "portrait";

    // Photo search API endpoint
    const apiEndpoint = "https://api.pexels.com/v1/search";

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            console.log(`Searching for Pexels photos with query: ${keyPhrase} (attempt ${attempt + 1})`);

            // Try different orientations based on attempt
            let orientation = "";
            if (attempt === 0 && orientationPreference) {
                orientation = orientationPreference;
            } else if (attempt === 1) {
                orientation = targetAspectRatio > 1 ? "portrait" : "landscape";
            }

            const perPage = 40;
            const apiUrl = `${apiEndpoint}?query=${encodeURIComponent(keyPhrase)}&per_page=${perPage}&orientation=${orientation}`;

            // Use a timeout to prevent hanging requests
            const response = await axios.get(
                apiUrl,
                {
                    headers,
                    timeout: 10000 // 10 second timeout
                }
            );

            const photos = response.data.photos;

            if (photos && photos.length > 0) {
                console.log(`Found ${photos.length} Pexels photos for query "${keyPhrase}"`);

                // Filter photos by aspect ratio
                const validPhotos = photos.filter((photo: any) => {
                    const photoAspectRatio = photo.width / photo.height;
                    return Math.abs(photoAspectRatio - targetAspectRatio) < 0.2;
                });

                if (validPhotos.length > 0) {
                    // Use LLM to select the best photo if there are multiple valid options
                    let selectedPhoto;
                    if (validPhotos.length > 1 && USE_LLM_SELECTION) {
                        // Convert photos to metadata format for LLM selection
                        const photosWithMetadata = validPhotos.map((photo: any) => ({
                            id: photo.id.toString(),
                            title: photo.alt || 'Untitled photo',
                            description: photo.alt || 'No description',
                            tags: photo.photographer ? [`By ${photo.photographer}`] : [],
                            url: photo.url,
                            width: photo.width,
                            height: photo.height,
                            quality: 'HD',
                            aspectRatio: photo.width / photo.height,
                            originalObject: photo
                        }));

                        // Use the same LLM selection function that's used for videos
                        const selectedPhotoWithMetadata = await selectBestVideoWithLLM(
                            keyPhrase,
                            photosWithMetadata,
                            keyPhrase
                        );

                        selectedPhoto = selectedPhotoWithMetadata?.originalObject || validPhotos[0];
                    } else {
                        // Default to first valid photo if LLM selection is not used
                        selectedPhoto = validPhotos[0];
                    }

                    // Generate a temporary file name for the photo
                    const photoFile = `temp_photo_${uuidv4()}.jpg`;

                    // Download the photo
                    await downloadPhoto(selectedPhoto.src.original, photoFile);

                    // Create a video from the photo with effects
                    const videoPath = await createVideoFromPhoto(photoFile, targetAspectRatio, cachedFilePath,);

                    // Clean up the photo file
                    // if (fs.existsSync(photoFile)) {
                    //     fs.unlinkSync(photoFile);
                    // }

                    return videoPath;
                } else {
                    const errorReason = "No photos with appropriate aspect ratio found";
                    console.log(`${errorReason} for Pexels query: ${keyPhrase}`);

                    // Log the failure
                    logSearchFailure({
                        timestamp: new Date().toISOString(),
                        query: keyPhrase,
                        source: 'Pexels',
                        searchType: 'image',
                        reason: errorReason,
                        attemptNumber: attempt + 1,
                        targetAspectRatio,
                        orientation
                    });
                }
            } else {
                const errorReason = "No photos found";
                console.log(`${errorReason} for Pexels query: ${keyPhrase}`);

                // Log the failure
                logSearchFailure({
                    timestamp: new Date().toISOString(),
                    query: keyPhrase,
                    source: 'Pexels',
                    searchType: 'image',
                    reason: errorReason,
                    attemptNumber: attempt + 1,
                    targetAspectRatio,
                    orientation
                });
            }
        } catch (error) {
            const errorReason = error instanceof Error ? error.message : String(error);
            console.error(
                `Error searching for Pexels photos with query "${keyPhrase}":`,
                errorReason
            );

            // Log the failure
            logSearchFailure({
                timestamp: new Date().toISOString(),
                query: keyPhrase,
                source: 'Pexels',
                searchType: 'image',
                reason: errorReason,
                attemptNumber: attempt + 1,
                targetAspectRatio,
                orientation: orientationPreference
            });
        }
    }

    const finalErrorReason = `Exhausted all ${maxRetries} attempts`;
    console.log(`Could not find suitable Pexels photo for: ${keyPhrase} - ${finalErrorReason}`);

    // Log the final failure
    logSearchFailure({
        timestamp: new Date().toISOString(),
        query: keyPhrase,
        source: 'Pexels',
        searchType: 'image',
        reason: finalErrorReason,
        targetAspectRatio
    });

    return null;
}

/**
 * Select the best photo based on aspect ratio match
 */
function selectBestPhoto(photos: any[], targetAspectRatio: number): any {
    return photos.find(photo => {
        const photoAspectRatio = photo.width / photo.height;
        return Math.abs(photoAspectRatio - targetAspectRatio) < 0.2;
    })
}



export interface Options {
    duration?: number;            // seconds (default 3)
    fps?: number;                 // frames / s (default 25)
    fitMode?: "contain_blur" | "direct";
    effect?: Effect;              // force a specific effect
}
type Effect =
    | "ken_burns" | "zoom_in" | "zoom_out"
    | "pan_left" | "pan_right" | "tilt_up" | "tilt_down"
    | "rotate_swing" | "pulse_saturation";


export async function createVideoFromPhoto(
    photoPath: string,
    targetAspectRatio: number,
    outputPath: string,
    opts: Options = {},
): Promise<string> {
    // ── config ───────────────────────────────────────────────────────────────
    const duration = opts.duration ?? 3;      // seconds
    const fps = opts.fps ?? 25;

    const tempDir = path.join(process.cwd(), "temp");
    const debugDir = path.join(process.cwd(), "debug_videos");
    [tempDir, debugDir].forEach((d) =>
        fs.existsSync(d) || fs.mkdirSync(d, { recursive: true }),
    );

    if (!fs.existsSync(photoPath)) throw new Error(`photo not found → ${photoPath}`);
    if (fs.statSync(photoPath).size < 1024) throw new Error("photo looks corrupt / empty");
    ensureOutputDirExists(outputPath);

    // ── geometry -------------------------------------------------------------
    const H = 1080;                                                    // reference height
    const W = 2 * Math.round((H * targetAspectRatio) / 2);            // even width

    // ── effect helpers -------------------------------------------------------
    type Effect =
        | "ken_burns" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right"
        | "tilt_up" | "tilt_down" | "rotate_swing" | "pulse_saturation";

    const allEffects: Effect[] = [
        "ken_burns", "zoom_in", "zoom_out", "pan_left", "pan_right",
        "tilt_up", "tilt_down", "rotate_swing", "pulse_saturation",
    ];

    const shuffle = <T,>(a: T[]) => {
        const out = [...a];
        for (let i = out.length - 1; i; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [out[i], out[j]] = [out[j], out[i]];
        }
        return out;
    };

    const queue = opts.effect
        ? [opts.effect, ...shuffle(allEffects.filter(e => e !== opts.effect))]
        : shuffle(allEffects);

    const fade = (d: number) =>
        `fade=t=in:st=0:d=0.4,fade=t=out:st=${(d - 0.4).toFixed(3)}:d=0.4`;

    // ── retry loop -----------------------------------------------------------
    let lastErr: unknown;
    for (const eff of queue) {
        try {
            const tmpOut = path.join(tempDir, `clip_${uuidv4()}.mp4`);

            // All effects will use this base filter setup
            let filterBase = [
                // Split source into background and foreground paths
                `[0:v]split=2[origBg][origFg]`,

                // Background path: Scale to fill frame, then blur
                `[origBg]scale=${W}:${H}:force_original_aspect_ratio=increase,` +
                `crop=${W}:${H},boxblur=luma_radius=min(h\\,w)/20:luma_power=1[bblur]`
            ];

            // Effect-specific filters with proper sizing for each effect type
            let fgFilter;

            if (eff === "pulse_saturation") {
                // Saturation pulse - just basic scaling with saturation effect
                fgFilter = `[origFg]scale=${W}:${H}:force_original_aspect_ratio=decrease,` +
                    `eq=saturation='1+0.3*sin(2*PI*t/3)'[fg]`;
            }
            else if (eff === "rotate_swing") {
                // Rotate effect - basic scaling with rotation
                fgFilter = `[origFg]scale=${W}:${H}:force_original_aspect_ratio=decrease,` +
                    `rotate='PI/180*sin(2*PI*t/3)*5':fillcolor=black[fg]`;
            }
            else if (eff === "zoom_in") {
                // Zoom in effect - use setpts to ensure proper timing
                fgFilter = `[origFg]scale=${W}:${H}:force_original_aspect_ratio=decrease,` +
                    `setpts=PTS-STARTPTS,scale=w='iw*(1+0.2*t/3)':h='ih*(1+0.2*t/3)':eval=frame[fg]`;
            }
            else if (eff === "zoom_out") {
                // Zoom out effect - start large and get smaller
                const zoomFactor = 1.2;
                fgFilter = `[origFg]scale=${W}*${zoomFactor}:${H}*${zoomFactor}:force_original_aspect_ratio=decrease,` +
                    `setpts=PTS-STARTPTS,scale=w='iw*(${zoomFactor}-0.2*t/3)':h='ih*(${zoomFactor}-0.2*t/3)':eval=frame[fg]`;
            }
            else if (eff === "ken_burns") {
                // Ken Burns effect - more resilient approach that works for any aspect ratio
                // First get a properly sized image, then apply subtle movement
                fgFilter = `[origFg]scale='if(gt(dar,${W}/${H}),${H}*(dar)*1.2,${W}*1.2)':'if(gt(dar,${W}/${H}),${H}*1.2,${W}/dar*1.2)',` +
                    `setpts=PTS-STARTPTS,` +
                    `crop=${W}:${H}:x='min((iw-${W})*abs(sin(t/3)),(iw-${W}))':y='min((ih-${H})*abs(cos(t/3)),(ih-${H}))'[fg]`;
            }
            else if (eff === "pan_left") {
                // Pan left - move from right to left
                fgFilter = `[origFg]scale='if(gt(dar,${W}/${H}),${H}*(dar),${W})':'if(gt(dar,${W}/${H}),${H},${W}/dar)',` +
                    `setpts=PTS-STARTPTS,` +
                    `crop=${W}:${H}:x='max(0,(iw-ow)*(1-t/${duration}))':y='max(0,(ih-oh)/2)'[fg]`;
            }
            else if (eff === "pan_right") {
                // Pan right - move from left to right with non-linear motion
                fgFilter = `[origFg]scale='if(gt(dar,${W}/${H}),${H}*(dar),${W})':'if(gt(dar,${W}/${H}),${H},${W}/dar)',` +
                    `setpts=PTS-STARTPTS,` +
                    `crop=${W}:${H}:x='max(0,(iw-ow)*(t/${duration}))':y='max(0,(ih-oh)/2)'[fg]`;
            }
            else if (eff === "tilt_up") {
                // Tilt up - move from bottom to top
                // FIXED: Ensure we have enough extra height and the calculation uses proper range
                fgFilter = `[origFg]scale='if(gt(dar,${W}/${H}),${H}*(dar)*1.2,${W}*1.2)':'if(gt(dar,${W}/${H}),${H}*1.2,${W}/dar*1.2)',` +
                    `setpts=PTS-STARTPTS,` +
                    `crop=${W}:${H}:x='max(0,(iw-ow)/2)':y='if(lte(ih,oh),0,max(0,(ih-oh)*(1-t/${duration})))'[fg]`;
            }
            else if (eff === "tilt_down") {
                // Tilt down - move from top to bottom
                // FIXED: Ensure we have enough extra height and the calculation uses proper range
                fgFilter = `[origFg]scale='if(gt(dar,${W}/${H}),${H}*(dar)*1.2,${W}*1.2)':'if(gt(dar,${W}/${H}),${H}*1.2,${W}/dar*1.2)',` +
                    `setpts=PTS-STARTPTS,` +
                    `crop=${W}:${H}:x='max(0,(iw-ow)/2)':y='if(lte(ih,oh),0,max(0,(ih-oh)*(t/${duration})))'[fg]`;
            }
            else {
                // Default - just scale with no effect
                fgFilter = `[origFg]scale=${W}:${H}:force_original_aspect_ratio=decrease[fg]`;
            }

            // Add foreground filter and final overlay 
            filterBase.push(fgFilter);
            filterBase.push(`[bblur][fg]overlay=(W-w)/2:(H-h)/2:shortest=1,${fade(duration)}[v]`);

            // Create the FFmpeg command with our filter chain
            const cmd = ffmpeg()
                .input(photoPath)
                .inputOptions(["-loop", "1"])
                .complexFilter(filterBase)
                .outputOptions([
                    "-map", "[v]",
                    "-t", duration.toString(),
                    "-r", fps.toString(),
                    "-c:v", "libx264",
                    "-pix_fmt", "yuv420p",
                    "-preset", "ultrafast",
                    "-profile:v", "main",
                    "-crf", "23",
                    "-movflags", "+faststart",
                ])
                .output(tmpOut);

            await executeFFmpegAsync(cmd, tmpOut, `photo→clip (${eff})`);

            if ((await ffProbeAsync(tmpOut)).format?.size! < 4096)
                throw new Error("output tiny / empty after probe");

            fs.copyFileSync(tmpOut, outputPath);
            fs.copyFileSync(
                tmpOut,
                path.join(debugDir, `debug_${eff}_${Date.now()}_${path.basename(outputPath)}`),
            );
            return outputPath;                       // success!
        } catch (err) {
            lastErr = err;
            console.warn(`\x1b[33m✖ ${eff} failed → ${(err as Error).message}\x1b[0m`);
        }
    }

    throw new Error(`All effects failed → ${(lastErr as Error)?.message ?? "unknown"}`);
}

/**
 * Search and download a video from Pexels matching the key phrase
 */
export async function searchAndDownloadVideo(
    timing: ClipTiming,
    targetAspectRatio: number,
    selectedVideos: string[],
    maxRetries: number = 3,
    scriptContext: string = ""
): Promise<string | null> {
    const headers = {
        Authorization: PEXELS_API_KEY || "",
    };
    const { keyword: keyPhrase, keywordType, sentenceText } = timing;
    // Check if API key is available
    if (!PEXELS_API_KEY) {
        const errorReason = "PEXELS_API_KEY not found in environment variables";
        console.error(errorReason);

        // Log the failure
        logSearchFailure({
            timestamp: new Date().toISOString(),
            query: keyPhrase,
            source: 'Pexels',
            searchType: 'video',
            reason: errorReason,
            targetAspectRatio
        });

        return null;
    }
    // Check cache for this key phrase
    const cacheKey = `${keyPhrase}_${targetAspectRatio.toFixed(2)}`;
    const cachedFilePath = path.join(CACHE_DIR, `${cacheKey.replace(/\s+/g, '_').replace(/[^\w]/g, '')}.mp4`);

    // Return cached video if it exists
    if (fs.existsSync(cachedFilePath)) {
        console.log(`Using cached video for "${keyPhrase}"`);
        return cachedFilePath;
    }

    let searchQueries: string[] = [keyPhrase];

    console.log(`Generated search queries for "${keyPhrase}":`, searchQueries);

    // Randomize orientation preference to increase variety
    const orientationPreference = targetAspectRatio > 1 ? "landscape" : "portrait"

    // Collect all valid videos from searches
    let allValidVideos: VideoWithMetadata[] = [];

    if (keywordType === 'search') {
        try {
            return await searchAndDownloadVideoFromWeb(keyPhrase, targetAspectRatio, maxRetries);
        } catch (error) {
            console.error("Error searching and downloading video:", error);
            console.log("Retrying with Pexels API");
        }
    }

    for (const query of searchQueries) {
        // Check if we have cached results for this query
        if (searchResultsCache[query]) {
            console.log(`Using cached search results for query: ${query}`);
            const videos = searchResultsCache[query];

            // Process the cached results
            if (videos.length > 0) {
                // Convert to VideoWithMetadata and add to our collection
                const validCachedVideos = convertToVideoWithMetadata(videos, targetAspectRatio);
                allValidVideos = [...allValidVideos, ...validCachedVideos];

                // If we have enough videos, we can proceed with LLM selection without trying more queries
                if (allValidVideos.length >= 5 && USE_LLM_SELECTION) {
                    break;
                }
            }
            continue;  // Skip API call if we already have results
        }

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                console.log(
                    `Searching for videos with query: ${query} (attempt ${attempt + 1})`
                );

                // Try different orientations based on attempt
                let orientation = "";
                if (attempt === 0 && orientationPreference) {
                    orientation = orientationPreference;
                } else if (attempt === 1 && targetAspectRatio !== 1) {
                    // On second attempt, try opposite orientation for variety
                    orientation = targetAspectRatio > 1 ? "portrait" : "landscape";
                }

                const perPage = 30; // Increased from 30 to get more results
                const apiUrl = `https://api.pexels.com/videos/search?query=${encodeURIComponent(
                    query
                )}&per_page=${perPage}&orientation=${orientation}`;

                // Use a timeout to prevent hanging requests
                const response = await axios.get<PexelsSearchResponse>(
                    apiUrl,
                    {
                        headers,
                        timeout: 10000 // 10 second timeout
                    }
                );

                const videos = response.data.videos;

                // Cache the search results
                searchResultsCache[query] = videos || [];

                if (videos && videos.length > 0) {
                    // Convert to VideoWithMetadata and add to our collection
                    const validQueryVideos = convertToVideoWithMetadata(videos, targetAspectRatio);
                    allValidVideos = [...allValidVideos, ...validQueryVideos];

                    // If we have enough videos, we can proceed with LLM selection without trying more queries
                    if (allValidVideos.length >= 5) {
                        break;
                    }
                } else {
                    const errorReason = "No videos found";
                    console.log(`${errorReason} for query: ${query}`);

                    // Log the failure
                    logSearchFailure({
                        timestamp: new Date().toISOString(),
                        query,
                        source: 'Pexels',
                        searchType: 'video',
                        reason: errorReason,
                        attemptNumber: attempt + 1,
                        targetAspectRatio,
                        orientation
                    });
                }
            } catch (error) {
                const errorReason = error instanceof Error ? error.message : String(error);
                console.error(
                    `Error searching for videos with query "${query}":`,
                    errorReason
                );

                // Log the failure
                logSearchFailure({
                    timestamp: new Date().toISOString(),
                    query,
                    source: 'Pexels',
                    searchType: 'video',
                    reason: errorReason,
                    attemptNumber: attempt + 1,
                    targetAspectRatio
                });
            }
        }
    }

    // If we're using LLM selection and have collected videos, select the best one
    if (allValidVideos.length > 0) {
        // Remove duplicates by video ID
        const uniqueVideos = Array.from(new Map(allValidVideos.map(v => [v.id, v])).values());
        console.log(`Collected ${uniqueVideos.length} unique videos across all queries`);

        // Limit to top 15 videos for LLM evaluation (increased from 8)
        const topVideos = uniqueVideos.slice(0, 15);

        // Use the script context if provided, otherwise use the key phrase as context
        const contextForLLM = scriptContext || keyPhrase;

        // Use LLM to select the best video with full script context awareness
        const selectedVideo = await selectBestVideoWithLLM(
            sentenceText,
            topVideos,
            contextForLLM, // Pass the full script context
            selectedVideos // Pass the selected videos
        );

        if (selectedVideo) {
            // Download and process the selected video
            const downloadedVideo = await downloadAndProcessVideo(selectedVideo, cachedFilePath);

            if (downloadedVideo) {
                selectedVideos.push(downloadedVideo);
                return downloadedVideo;
            }
        }
    }

    try {
        return await searchAndDownloadVideoFromWeb(keyPhrase, targetAspectRatio, maxRetries);
    } catch (error) {
        console.error("Error searching and downloading video:", error);
        console.log("Retrying with Pexels API");
    }

    const finalErrorReason = "No suitable videos found across all queries";
    console.log(`Could not find suitable video for: ${keyPhrase} - ${finalErrorReason}`);

    // Log the final failure
    logSearchFailure({
        timestamp: new Date().toISOString(),
        query: keyPhrase,
        source: 'Pexels',
        searchType: 'video',
        reason: finalErrorReason,
        targetAspectRatio
    });

    return null;
}

/**
 * Convert Pexels videos to our VideoWithMetadata format
 */
function convertToVideoWithMetadata(videos: any[], targetAspectRatio: number): VideoWithMetadata[] {
    // Filter videos by minimum duration
    const minDuration = 3; // seconds

    const videoFiles = videos
        .filter(v => v.duration >= minDuration)
        .flatMap(video => {
            // Find HD and standard quality video files
            const hdFiles = video.video_files
                .filter((file: any) => file.width >= 1280 && file.quality === "hd")
                .sort((a: any, b: any) => b.width * b.height - a.width * a.height);

            const stdFiles = video.video_files
                .filter((file: any) => file.width >= 640)
                .sort((a: any, b: any) => b.width * b.height - a.width * a.height);

            const videoFiles = [...hdFiles, ...stdFiles];

            // Create metadata objects for each suitable video file
            return videoFiles
                .filter(file => {
                    const aspectRatio = file.width / file.height;
                    // Accept videos with aspect ratios within 20% of target
                    return Math.abs(aspectRatio - targetAspectRatio) < 0.2;
                })
                .map((file: any) => {
                    // Extract metadata from the video
                    const aspectRatio = file.width / file.height;
                    const tags: string[] = [];

                    // Add user tags if available
                    if (video.user && video.user.name) {
                        tags.push(`By ${video.user.name}`);
                    }

                    // Add quality and resolution tags
                    tags.push(file.quality === "hd" ? "HD" : "SD");
                    tags.push(`${file.width}x${file.height}`);

                    // Generate title if none exists
                    const videoUrlParts = video.url?.split('/');
                    const title = videoUrlParts?.[videoUrlParts.length - 2]?.replace(/-/g, ' ') || 'Stock video';
                    return {
                        id: `${video.id}_${file.id}`,
                        title: title,
                        description: `${title} - ${file.quality} quality video from Pexels`,
                        tags: tags,
                        url: video.url,
                        duration: video.duration,
                        videoUrl: file.link,
                        width: file.width,
                        height: file.height,
                        quality: file.quality,
                        aspectRatio: aspectRatio,
                        originalObject: { video, file }
                    };
                });
        });

    // return unique videos by title
    return videoFiles.filter((v, index, self) =>
        index === self.findIndex((t) => t.title === v.title)
    );
}

/**
 * Download and process a selected video
 */
async function downloadAndProcessVideo(
    selectedVideo: VideoWithMetadata,
    cachedFilePath: string
): Promise<string | null> {
    const videoUrl = selectedVideo.videoUrl;
    const videoFile = `video_${uuidv4()}.mp4`;

    try {
        const writer = fs.createWriteStream(videoFile);
        const videoResponse = await axios({
            url: videoUrl,
            method: "GET",
            responseType: "stream",
            timeout: 30000, // 30-second timeout
        });

        videoResponse.data.pipe(writer);

        await new Promise<void>((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
        });

        // Verify the downloaded video is valid
        try {
            await new Promise<string>((resolve, reject) => {
                ffmpeg.ffprobe(videoFile, (err, metadata) => {
                    if (err) {
                        console.error("Invalid video file:", err);
                        if (fs.existsSync(videoFile)) {
                            fs.unlinkSync(videoFile);
                        }
                        reject(err);
                    } else if (!metadata.streams || metadata.streams.length === 0) {
                        console.error("Video file has no streams");
                        if (fs.existsSync(videoFile)) {
                            fs.unlinkSync(videoFile);
                        }
                        reject(new Error("Video file has no streams"));
                    } else {
                        console.log(`Downloaded valid video: ${selectedVideo.title}`);

                        // Save to cache
                        try {
                            fs.copyFileSync(videoFile, cachedFilePath);
                        } catch (cacheErr) {
                            console.error("Failed to cache video:", cacheErr);
                        }

                        resolve(videoFile);
                    }
                });
            });

            return videoFile;
        } catch (probeError) {
            console.error("Error validating video:", probeError);
            if (fs.existsSync(videoFile)) {
                fs.unlinkSync(videoFile);
            }
        }
    } catch (downloadError) {
        console.error("Error downloading video:", downloadError);
        if (fs.existsSync(videoFile)) {
            fs.unlinkSync(videoFile);
        }
    }

    return null;
}

/**
 * Get the duration and aspect ratio of a video file
 */
export async function getVideoMetadata(videoFile: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoFile, (err, metadata) => {
            if (err) {
                reject(err);
                return;
            }

            const format = metadata.format;
            const stream = metadata.streams[0];

            if (!format || !stream || !format.duration || !stream.width || !stream.height) {
                reject(new Error("Invalid video metadata"));
                return;
            }

            const duration = format.duration;
            const width = stream.width;
            const height = stream.height;
            const aspectRatio = width / height;

            resolve({ duration, aspectRatio });
        });
    });
}

/**
 * Process a single clip with enhanced keyword search options
 */
export async function processClip(
    generationId: string,
    userId: string,
    timing: ClipTiming,
    targetAspectRatio: number,
    selectedVideos: string[],
    processedClipsLength: number = 0,
    scriptText: string = ""
): Promise<{ clipPath: string, duration: number, actualDuration: number, keyword: string } | null> {
    const { keyword: keyPhrase, duration: desiredDuration, keywordType, sentenceText } = timing;
    console.log(`Searching for clip with key phrase: ${keyPhrase} (duration: ${desiredDuration}s)`);

    // Check if we have multiple keywords (comma separated)
    const keywordOptions = keyPhrase.includes(',') && keywordType === 'stock'
        ? keyPhrase.split(',').map(k => k.trim()).filter(k => k.length > 0)
        : [keyPhrase];

    // Try each keyword option in order until we find a suitable video
    for (const keyword of keywordOptions) {
        console.log(`Trying keyword option: "${keyword}"`);
        const videoFile = await searchAndDownloadVideo(
            timing,
            targetAspectRatio,
            selectedVideos,
            3, // maxRetries
            scriptText // Pass scriptText for LLM context
        );

        if (!videoFile) {
            console.log(`No video found for: "${keyword}", trying next option if available`);
            continue;
        }

        try {
            // Get video metadata
            const { duration: videoDuration, aspectRatio: videoAspectRatio } = await getVideoMetadata(videoFile);
            console.log(`Video duration for "${keyword}":`, videoDuration);

            // Update target aspect ratio for consistency if this is the first clip
            let updatedAspectRatio = targetAspectRatio;
            if (processedClipsLength === 0) {
                updatedAspectRatio = videoAspectRatio;
            }

            // Adjust clip duration based on the video's available length
            // but try to match the desired duration as closely as possible
            const clipDuration = Math.min(videoDuration, desiredDuration);

            // If the video is shorter than desired, we'll need to slow it down
            // or loop it to match the timing better
            const speedFactor =
                videoDuration < desiredDuration && videoDuration > 3
                    ? desiredDuration / videoDuration
                    : 1;

            // Calculate where to start in the video
            // Try to avoid the first second which often has logos/transitions
            let startTime = 0;

            // Create a temp file with sequence number and keyword in the name
            const tempClip = createSequencedTempFilePath(processedClipsLength, keyword.replace(/\s+/g, '-').substring(0, 15), "mp4");

            // Process the clip
            await new Promise<void>((resolveClip, rejectClip) => {
                let command = ffmpeg(videoFile)
                    .setStartTime(startTime)
                    .setDuration(clipDuration);

                // Apply speed adjustment if necessary (slow down or speed up)
                const filterComplex: string[] = [];

                if (speedFactor !== 1) {
                    if (speedFactor < 1) {
                        // Speed up the video
                        filterComplex.push(`[0:v]setpts=${1 / speedFactor}*PTS[v]`);
                        command = command.outputOptions(['-map', '[v]']);
                    } else if (speedFactor < 2) {
                        // Slow down the video (up to 2x slower)
                        filterComplex.push(`[0:v]setpts=${speedFactor}*PTS[v]`);
                        command = command.outputOptions(['-map', '[v]']);
                    } else {
                        // For significant slowing, use frame interpolation
                        filterComplex.push(`[0:v]minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:me_mode=bidir,setpts=${Math.min(speedFactor, 3)}*PTS[v]`);
                        command = command.outputOptions(['-map', '[v]']);
                    }
                } else {
                    // Standard processing with resolution based on target aspect ratio
                    // Determine resolution based on aspect ratio
                    let targetWidth, targetHeight;
                    const baseResolution = 1080; // Base resolution height (for landscape) or width (for portrait)

                    if (updatedAspectRatio >= 1) {
                        // Landscape or square (e.g., 16:9, 4:3, 1:1)
                        targetHeight = baseResolution;
                        targetWidth = Math.round(baseResolution * updatedAspectRatio);
                        // Ensure width is even (required by some codecs)
                        targetWidth = targetWidth % 2 === 0 ? targetWidth : targetWidth + 1;
                    } else {
                        // Portrait (e.g., 9:16)
                        targetWidth = baseResolution;
                        targetHeight = Math.round(baseResolution / updatedAspectRatio);
                        // Ensure height is even
                        targetHeight = targetHeight % 2 === 0 ? targetHeight : targetHeight + 1;
                    }

                    console.log(`Using resolution ${targetWidth}x${targetHeight} for aspect ratio ${updatedAspectRatio.toFixed(2)}`);

                    command = command.videoFilters([
                        `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2`, // Scale to target aspect ratio
                    ]);
                }

                if (filterComplex.length > 0) {
                    command = command.complexFilter(filterComplex);
                }

                command.output(tempClip)
                    .outputOptions([
                        "-c:v",
                        "libx264", // CPU encoding, could be replaced with hardware acceleration
                        "-preset",
                        "faster",
                        "-profile:v",
                        "high",
                        "-crf",
                        "26", // Increased from 23 to 26 for faster encoding with slight quality reduction
                        "-pix_fmt",
                        "yuv420p",
                    ])
                    .on("end", () => {
                        console.log(`Created clip ${processedClipsLength} for "${keyword}": ${tempClip}`);

                        try {
                            fs.unlinkSync(videoFile); // Remove the original downloaded video
                        } catch (err) {
                            console.error("Error removing downloaded video:", err);
                        }

                        resolveClip();
                    })
                    .on("error", (err) => {
                        console.error(`Error creating clip for "${keyword}":`, err);
                        try {
                            fs.unlinkSync(videoFile); // Remove the original downloaded video
                        } catch (unlinkErr) {
                            console.error("Error removing downloaded video:", unlinkErr);
                        }

                        rejectClip(err);
                    })
                    .run();
            });
            // upload to s3
            const s3 = new AWS.S3();
            const s3Params = {
                Bucket: process.env.S3_CACHE_BUCKET || 'video-gennie-cache',
                Key: `${userId}/${generationId}/clips/${tempClip}`,
                Body: fs.readFileSync(tempClip),
                ContentType: 'video/mp4'
            };
            const uploadResult = await s3.upload(s3Params).promise();
            console.log("Clip uploaded to S3:", uploadResult.Location);
            fs.unlinkSync(tempClip);


            // Successfully processed this keyword option
            return {
                clipPath: uploadResult.Location,
                duration: desiredDuration,
                actualDuration: clipDuration,
                keyword: keyword
            };
        } catch (error) {
            console.error(`Error processing video for "${keyword}":`, error);
            // Clean up the downloaded video if it exists
            if (videoFile && fs.existsSync(videoFile)) {
                try {
                    fs.unlinkSync(videoFile);
                } catch (unlinkErr) {
                    console.error("Error removing downloaded video:", unlinkErr);
                }
            }
            // Continue to the next keyword option
        }
    }

    // If we get here, we couldn't find a suitable video for any keyword option
    console.log(`Could not find suitable video for any of the options: ${keywordOptions.join(', ')}`);
    return null;
} 