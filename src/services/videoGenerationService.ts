import { StorageFactory } from "../storage/StorageFactory";
import { processWordMarksIntoSegments, processBatch, processWordMarksWithLLM } from "./clipSyncService";
import { concatenateClipsWithTimings, processFinalVideoWithMusic, applySubtitles } from "./ffmpegService";
import { parseAspectRatio } from "../utils/ffmpegUtils";
import { createOutputFilePath } from "../utils";
import { LocaleCode, VoiceId } from "../config/languages";
import { generateScript, determineMoodFromScript } from "./scriptService";
import { generateVoiceOver, generateSpeechMarks, fetchBackgroundMusic, generatePresignedUrl } from "./audioService";
import { ClipTiming, GenerationState } from "../types/generation";
import tmp from "tmp";
import fs from "fs";
import AWS from "aws-sdk";

// Initialize S3 client (same as in audioService)
const s3 = new AWS.S3();

/**
 * Service class to handle all video generation steps
 */
export class VideoGenerationService {
    private storage = StorageFactory.getInstance();

    /**
     * Generates a script for the video.
     * If a `userScript` is provided, it will be used directly. Otherwise, a script is generated from the prompt.
     * Optional memories (e.g. from Mem0) are passed as context to personalize the script.
     *
     * @param generationId - The ID of the current video generation.
     * @param prompt - The prompt to generate the script from (if `userScript` is not provided).
     * @param language - The language of the script.
     * @param twoPhaseScriptGeneration - Whether to use a two-phase generation process for the script.
     * @param options - Optional. userScript to use directly; memories array to inject as context.
     * @returns A promise that resolves to an object containing the script content and its mood.
     */
    async generateScript(
        generationId: string,
        prompt: string,
        language: LocaleCode,
        twoPhaseScriptGeneration: boolean = false,
        options?: { userScript?: string; memories?: string[] }
    ): Promise<{ script: string; mood: string }> {
        console.log(`Generating script in ${language}...`);
        let scriptContent: string;
        let scriptSource: 'generated' | 'user';

        const memoryContext = options?.memories?.length
            ? options.memories.filter(Boolean).join("\n")
            : undefined;
        if (memoryContext) {
            console.log(`Using ${options!.memories!.length} memories for script generation.`);
        }

        scriptContent = await generateScript(prompt, language, twoPhaseScriptGeneration, memoryContext);
        scriptSource = 'generated';
        console.log("Generated script from prompt.");

        const mood = await determineMoodFromScript(scriptContent);

        await this.storage.update(generationId, {
            script: {
                content: scriptContent,
                mood,
                source: scriptSource
            }
        });

        return { script: scriptContent, mood };
    }

    /**
     * Generates audio and speech marks for the video.
     * If `editedScript` is provided, it's used for audio generation; otherwise, the `script` parameter (original project script) is used.
     * Fetches background music based on the provided `mood`.
     * Saves audio details, including the script content used and its source, to the generation state.
     *
     * @param generationId - The ID of the current video generation.
     * @param script - The primary script content (e.g., from `state.script.content`).
     * @param mood - The mood of the script, used for selecting background music.
     * @param language - The language for audio generation.
     * @param editedScript - Optional. A specific version of the script to use for audio generation, overriding the main `script`.
     * @returns A promise that resolves to an object containing the audio file URL, speech marks, and background music URL.
     */
    async generateAudio(
        generationId: string,
        userId: string,
        script: string, // This is the original script from state.script.content
        mood: string,
        languageCode: LocaleCode,
        voiceId: VoiceId,
        editedScript?: string, // Optional edited script for audio
        memories?: string[] // Optional preferences (audio/caption) from Mem0
    ): Promise<{ audioFile: string; speechMarks: any[]; backgroundMusic: string }> {

        if (memories?.length) {
            console.log(`Using ${memories.length} preference memories for audio step.`);
        }

        const scriptForAudio = (editedScript && editedScript.trim().length > 0) ? editedScript : script;
        const scriptSourceForAudio: 'project_script' | 'custom_for_audio' =
            (editedScript && editedScript.trim().length > 0) ? 'custom_for_audio' : 'project_script';

        if (scriptSourceForAudio === 'custom_for_audio') {
            console.log("Using custom script for audio generation.");
        } else {
            console.log("Using project script for audio generation.");
        }

        const audioFile = await generateVoiceOver(scriptForAudio, generationId, userId, languageCode, voiceId);
        const speechMarks = await generateSpeechMarks(scriptForAudio, languageCode, voiceId);

        console.log("Searching for background music...");
        // Mood is still derived from the original script's mood or overall project mood
        const backgroundMusic = await fetchBackgroundMusic(mood, generationId, userId);
        if (!backgroundMusic) {
            throw new Error("No background music found");
        }

        await this.storage.update(generationId, {
            audio: {
                audioUrl: audioFile,
                speechMarks,
                backgroundMusicUrl: backgroundMusic,
                duration: 0, // Assuming duration might be updated later
                scriptContentUsed: scriptForAudio,
                scriptSource: scriptSourceForAudio
            }
        });

        // Return S3 URLs for internal processing (presigned URLs generated only when returning to user)
        return { audioFile, speechMarks, backgroundMusic };
    }

    /**
     * Extracts keywords and determines clip timings for the video.
     * If `userClipTimings` are provided, they are used directly. Otherwise, keywords are extracted from the script using speech marks.
     * The extracted or provided clip timings and their source are saved to the generation state.
     *
     * @param generationId - The ID of the current video generation.
     * @param speechMarks - Speech marks generated from the audio step, used for automatic keyword extraction.
     * @param script - The script content, used as context for automatic keyword extraction.
     * @param userClipTimings - Optional. User-provided clip timings to use instead of automatic extraction.
     * @returns A promise that resolves to an array of `ClipTiming` objects.
     */
    async extractKeywords(
        generationId: string,
        speechMarks: any[],
        script: string,
        userClipTimings?: ClipTiming[] // New optional parameter for user-provided clip timings
    ): Promise<ClipTiming[]> {
        let finalClipTimings: ClipTiming[];
        let keywordsSource: 'generated' | 'user';

        if (userClipTimings && userClipTimings.length > 0) {
            console.log("Using user-provided clip timings.");
            finalClipTimings = userClipTimings;
            keywordsSource = 'user';
        } else {
            console.log("Generating clip timings from script and speech marks.");
            const generatedClipTimings: ClipTiming[] = [];
            const wordMarks = speechMarks.filter(mark => mark.type === 'word');

            if (wordMarks.length === 0) {
                throw new Error("No speech marks found, cannot extract keywords automatically");
            }

            // Existing logic for automatic keyword extraction
            // const llmTimings = await processWordMarksWithLLM(wordMarks, 2.0, script);
            // if (llmTimings && llmTimings.length > 0) {
            //     generatedClipTimings.push(...llmTimings);
            // } else {
            //     await processWordMarksIntoSegments(wordMarks, 2.0, script, generatedClipTimings);
            // }
            await processWordMarksIntoSegments(wordMarks, 2.0, script, generatedClipTimings);

            finalClipTimings = generatedClipTimings;
            keywordsSource = 'generated';
        }

        await this.storage.update(generationId, {
            keywords: {
                clipTimings: finalClipTimings,
                source: keywordsSource
            }
        });

        return finalClipTimings;
    }

    /**
     * Processes video clips based on clip timings.
     * If `overrideClipTimings` are provided, they are used for fetching and processing clips.
     * Otherwise, `baseClipTimings` (typically from the keyword extraction step) are used.
     * Saves the processed clips, the timings used, and their source to the generation state.
     *
     * @param generationId - The ID of the current video generation.
     * @param baseClipTimings - The primary set of clip timings (e.g., from `state.keywords.clipTimings`).
     * @param aspectRatio - The target aspect ratio for the video clips.
     * @param script - The script content, used as context if needed by `processBatch`.
     * @param overrideClipTimings - Optional. User-provided clip timings to use instead of `baseClipTimings`.
     * @returns A promise that resolves to an array of processed clip objects.
     */
    async processClips(
        generationId: string,
        userId: string,
        baseClipTimings: ClipTiming[], // Timings from the keyword extraction step
        aspectRatio: string,
        script: string,
        overrideClipTimings?: ClipTiming[] // Optional user-provided overrides
    ): Promise<Array<{ clip: string, keyword: string, start: number, duration: number, actualDuration: number }>> {
        let actualClipTimingsToUse: ClipTiming[];
        let timingsSourceForClips: 'from_keywords_step' | 'custom_for_clips_step';

        if (overrideClipTimings && overrideClipTimings.length > 0) {
            console.log("Using user-provided override clip timings for processing clips.");
            actualClipTimingsToUse = overrideClipTimings;
            timingsSourceForClips = 'custom_for_clips_step';
        } else {
            console.log("Using clip timings from keywords step for processing clips.");
            actualClipTimingsToUse = baseClipTimings;
            timingsSourceForClips = 'from_keywords_step';
        }

        const targetAspectRatio = parseAspectRatio(aspectRatio);
        const BATCH_SIZE = 3;
        const clipBatches: typeof actualClipTimingsToUse[] = [];
        const selectedVideos: string[] = [];
        for (let i = 0; i < actualClipTimingsToUse.length; i += BATCH_SIZE) {
            clipBatches.push(actualClipTimingsToUse.slice(i, i + BATCH_SIZE));
        }

        let processedClips: Array<{ clip: string, keyword: string, start: number, duration: number, actualDuration: number }> = [];

        for (const batch of clipBatches) {
            const batchResults = await processBatch(
                generationId,
                userId,
                batch,
                targetAspectRatio,
                processedClips.length,
                script,
                selectedVideos
            );
            processedClips.push(...batchResults);
        }

        // Sort clips by start time
        processedClips.sort((a, b) => a.start - b.start);

        await this.storage.update(generationId, {
            clips: {
                processedClips,
                clipTimingsUsed: actualClipTimingsToUse,
                timingsSource: timingsSourceForClips
            }
        });

        return processedClips;
    }

    /**
     * Download S3 file to temporary local file using AWS S3 SDK
     * @param s3Url - S3 URL to download
     * @param fileExtension - File extension for the temp file
     * @returns Temporary file object with local path
     */
    private async downloadS3FileToTemp(s3Url: string, fileExtension: string): Promise<{ path: string; cleanup: () => void }> {
        try {
            // Parse the S3 URL to extract bucket and key
            const url = new URL(s3Url);
            let bucket: string;
            let key: string;

            // Handle different S3 URL formats
            if (url.hostname.includes('.s3.')) {
                // Format: https://bucket.s3.region.amazonaws.com/key
                bucket = url.hostname.split('.')[0];
                key = decodeURIComponent(url.pathname.substring(1)); // Decode URL-encoded characters and remove leading slash
            } else if (url.hostname.startsWith('s3.')) {
                // Format: https://s3.region.amazonaws.com/bucket/key
                const pathParts = url.pathname.substring(1).split('/');
                bucket = pathParts[0];
                key = decodeURIComponent(pathParts.slice(1).join('/')); // Decode URL-encoded characters
            } else {
                throw new Error('Invalid S3 URL format');
            }

            console.log(`Downloading from S3 - Bucket: ${bucket}, Key: ${key}`);

            // Use AWS S3 SDK to download the file
            const s3Object = await s3.getObject({
                Bucket: bucket,
                Key: key
            }).promise();

            if (!s3Object.Body) {
                throw new Error('No data received from S3');
            }

            const tempFile = tmp.fileSync({ postfix: `.${fileExtension}`, keep: false });

            // Write the S3 object data to temp file
            const buffer = s3Object.Body instanceof Buffer ? s3Object.Body : Buffer.from(s3Object.Body as any);
            fs.writeFileSync(tempFile.name, buffer);

            console.log(`Downloaded S3 file to temp: ${tempFile.name}`);

            return {
                path: tempFile.name,
                cleanup: () => tempFile.removeCallback()
            };
        } catch (error) {
            console.error(`Error downloading S3 file ${s3Url}:`, error);
            throw new Error(`Failed to download S3 file: ${s3Url}`);
        }
    }

    /**
     * Concatenate clips and add background music
     */
    async concatenateClips(
        generationId: string,
        userId: string,
        processedClips: Array<{ clip: string, keyword: string, start: number, duration: number, actualDuration: number }>,
        audioFile: string,
        backgroundMusic: string,
        aspectRatio: string,
    ): Promise<string> {
        const tempFiles: Array<{ cleanup: () => void }> = [];

        try {
            console.log("Downloading S3 files for video processing...");

            // Download audio file from S3 to temp file
            const audioTempFile = await this.downloadS3FileToTemp(audioFile, 'mp3');
            tempFiles.push(audioTempFile);

            // Download background music from S3 to temp file
            const backgroundMusicTempFile = await this.downloadS3FileToTemp(backgroundMusic, 'mp3');
            tempFiles.push(backgroundMusicTempFile);

            // Download all clip files from S3 to temp files and update processedClips array
            const localProcessedClips = await Promise.all(
                processedClips.map(async (clip) => {
                    const clipTempFile = await this.downloadS3FileToTemp(clip.clip, 'mp4');
                    tempFiles.push(clipTempFile);

                    return {
                        ...clip,
                        clip: clipTempFile.path // Replace S3 URL with local temp file path
                    };
                })
            );

            console.log("All S3 files downloaded to temporary files. Starting video processing...");

            const targetAspectRatio = parseAspectRatio(aspectRatio);

            const { mergedVideo, fileList, normalizedClips } = await concatenateClipsWithTimings(
                localProcessedClips,
                audioTempFile.path,
                targetAspectRatio
            );

            const finalVideoPath = createOutputFilePath("with-music", "mp4");
            const finalVideo = await processFinalVideoWithMusic(
                finalVideoPath,
                mergedVideo,
                backgroundMusicTempFile.path,
                fileList,
                normalizedClips
            );

            // upload to s3
            const s3 = new AWS.S3();
            const s3Params = {
                Bucket: process.env.S3_CACHE_BUCKET || 'video-gennie-cache',
                Key: `${userId}/${generationId}/final-video.mp4`,
                Body: fs.readFileSync(finalVideoPath),
                ContentType: 'video/mp4'
            };
            const uploadResult = await s3.upload(s3Params).promise();
            console.log("Clip uploaded to S3:", uploadResult.Location);
            fs.unlinkSync(finalVideoPath);

            await this.storage.update(generationId, {
                baseVideo: {
                    mergedVideoUrl: uploadResult.Location
                }
            });

            console.log("Video processing completed successfully.");
            return uploadResult.Location;

        } catch (error) {
            console.error("Error in concatenateClips:", error);
            throw error;
        } finally {
            // Clean up all temporary files
            console.log("Cleaning up temporary files...");
            for (const tempFile of tempFiles) {
                try {
                    tempFile.cleanup();
                } catch (cleanupError) {
                    console.error("Error cleaning up temp file:", cleanupError);
                }
            }
            console.log("Temporary file cleanup completed.");
        }
    }

    /**
     * Apply subtitles to video. Optional caption memories (e.g. from Mem0) can influence styling.
     */
    async applySubtitles(
        generationId: string,
        userId: string,
        baseVideo: string,
        speechMarks: any[],
        aspectRatio: string,
        languageCode: LocaleCode,
        captionMemories?: string[]
    ): Promise<string> {
        console.log("Applying subtitles to the final video...");
        if (captionMemories?.length) {
            console.log(`Using ${captionMemories.length} caption preference memories for subtitle styling.`);
        }

        let tempFile: { path: string, cleanup: () => void } | null = null;

        try {

            console.log("BaseVideo is S3 URL, downloading to temporary file...");
            tempFile = await this.downloadS3FileToTemp(baseVideo, 'mp4');


            const finalVideoUrl = await applySubtitles(
                tempFile.path,
                speechMarks,
                aspectRatio,
                languageCode,
                captionMemories
            );

            // upload to s3
            const s3 = new AWS.S3();
            const s3Params = {
                Bucket: process.env.S3_CACHE_BUCKET || 'video-gennie-cache',
                Key: `${userId}/${generationId}/final-video-with-subtitles.mp4`,
                Body: fs.readFileSync(finalVideoUrl),
                ContentType: 'video/mp4'
            };
            const uploadResult = await s3.upload(s3Params).promise();
            console.log("Clip uploaded to S3:", uploadResult.Location);
            fs.unlinkSync(finalVideoUrl);

            await this.storage.update(generationId, {
                finalVideo: {
                    videoUrl: uploadResult.Location
                }
            });

            console.log("Subtitles applied successfully.");
            return uploadResult.Location;

        } catch (error) {
            console.error("Error in applySubtitles:", error);
            throw error;
        } finally {
            // Clean up temporary file if it was created
            if (tempFile) {
                try {
                    console.log("Cleaning up temporary video file...");
                    tempFile.cleanup();
                    console.log("Temporary video file cleanup completed.");
                } catch (cleanupError) {
                    console.error("Error cleaning up temp video file:", cleanupError);
                }
            }
        }
    }

    /**
     * Process the entire video generation pipeline
     */
    async generateCompleteVideo(
        generationId: string,
        userId: string,
        generationState: GenerationState
    ): Promise<string> {

        let script: string = generationState?.script?.content || '';
        let mood: string = generationState?.script?.mood || '';
        let audioFile: string = generationState?.audio?.audioUrl || '';
        let speechMarks: any[] = generationState?.audio?.speechMarks || [];
        let backgroundMusic: string = generationState?.audio?.backgroundMusicUrl || '';
        let clipTimings: ClipTiming[] = generationState?.clips?.clipTimingsUsed || [];
        let processedClips: Array<{ clip: string, keyword: string, start: number, duration: number, actualDuration: number }> = generationState?.clips?.processedClips || [];
        let baseVideo: string = generationState?.baseVideo?.mergedVideoUrl || '';
        let finalVideo: string = generationState?.finalVideo?.videoUrl || '';
        const { prompt, options: { twoPhaseScriptGeneration, aspectRatio, languageCode, voiceId } } = generationState?.initialParams || {};


        if (!generationState?.script) {
            ({ script, mood } = await this.generateScript(generationId, prompt, languageCode, twoPhaseScriptGeneration));
        }

        if (!generationState?.audio) {
            if (!languageCode || !voiceId) {
                throw new Error("Language and voice ID are required");
            }
            ({ audioFile, speechMarks, backgroundMusic } = await this.generateAudio(
                generationId,
                userId,
                script!,
                mood!,
                languageCode,
                voiceId,
                undefined // Pass undefined for editedScript
            ));
        }


        if (!generationState?.keywords) {
            clipTimings = await this.extractKeywords(
                generationId,
                speechMarks,
                script,
                undefined // Pass undefined for userClipTimings
            );
        }

        if (!generationState?.clips) {
            processedClips = await this.processClips(
                generationId,
                userId,
                clipTimings, // baseClipTimings
                aspectRatio,
                script,
                undefined // overrideClipTimings
            );
        }

        if (!generationState?.baseVideo) {
            baseVideo = await this.concatenateClips(generationId, userId, processedClips, audioFile, backgroundMusic, aspectRatio);
        }

        if (!generationState?.finalVideo) {
            return await this.applySubtitles(generationId, userId, baseVideo, speechMarks, aspectRatio, languageCode);
        }

        return finalVideo;
    }
}