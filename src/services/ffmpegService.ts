import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { SpeechMark } from "../types";
import {
    cleanupFiles,
    cleanupTempFiles,
    createOutputFilePath,
    createSequencedTempFilePath,
    ensureOutputDirExists
} from "../utils";
import { handleFFmpegError } from "../utils/errorHandling";
import {
    executeFFmpegAsync,
    ffProbeAsync
} from "../utils/ffmpegPromises";
import {
    createAudioMixingFilter,
    getAspectRatioDimensions,
} from "../utils/ffmpegUtils";
import {
    logClipsTable
} from "../utils/logger";
import {
    addCaptionsToVideo
} from "../utils/subtitleUtils";
import {
    generateFancyCaptions,
} from "./subtitleService";
import { LocaleCode } from "../config/languages";

// --------------------------
// Core FFmpeg Functions
// --------------------------

/**
 * Process the final video with music
 */
export async function processFinalVideoWithMusic(
    finalVideoPath: string,
    mergedVideoPath: string,
    backgroundMusic: string,
    fileList: string,
    filesToClean: string[],
): Promise<string> {
    console.log(`Adding background music to video`);
    // Get video length to extend it
    try {
        const probeData = await ffProbeAsync(mergedVideoPath);
        const videoDuration = probeData.format?.duration || 0;
        console.log("Merged video duration:", videoDuration);

        try {

            // Step 2: Add music to the extended video
            const videoInputIndex = 0;
            const musicInputIndex = 1;

            // Define the filter complex with reduced music volume
            const filterComplex = createAudioMixingFilter(videoInputIndex, musicInputIndex);

            // More reliable output options that should work across different FFmpeg versions
            const outputOptions = [
                // Video settings
                "-c:v", "libx264",  // Use libx264 instead of copy to ensure compatibility
                "-preset", "medium", // Better compatibility with standard preset
                "-profile:v", "main",
                "-pix_fmt", "yuv420p", // Ensure wide compatibility
                // Audio settings
                "-c:a", "aac",
                "-b:a", "192k",
                // Filter settings  
                "-filter_complex", filterComplex,
                "-map", `${videoInputIndex}:v`,
                "-map", "[aout]",
                // Other settings
                "-shortest"
            ];
            // No captions, just process video with audio
            try {
                console.log(`Creating final video with audio: ${mergedVideoPath} + ${backgroundMusic} -> ${finalVideoPath}`);
                const finalCommand = ffmpeg()
                    .input(mergedVideoPath)
                    .input(backgroundMusic)
                    .outputOptions(outputOptions)
                    .output(finalVideoPath);

                await executeFFmpegAsync(
                    finalCommand,
                    finalVideoPath,
                    "Final video assembly"
                );

                // Clean up temp files on success
                const filesToCleanup = [
                    mergedVideoPath,
                    fileList,
                    backgroundMusic,
                    ...filesToClean
                ].filter(Boolean) as string[];

                cleanupFiles(filesToCleanup);
                return finalVideoPath;
            } catch (error) {
                console.error("Error creating final video:", error);
                cleanupTempFiles(); // Clean up everything on error
                throw handleFFmpegError(error, "final video creation");
            }
        } catch (error) {
            console.error("Error processing final video with music:", error);
            throw handleFFmpegError(error, "video processing");
        }
    } catch (probeErr) {
        console.error("Error getting merged video metadata:", probeErr);
        throw probeErr instanceof Error ? probeErr : new Error(String(probeErr));
    }
}

/**
 * Concatenate clips with precise timing to match speech
 */
export async function concatenateClipsWithTimings(
    processedClips: Array<{ clip: string, keyword: string, start: number, duration: number, actualDuration: number }>,
    audioFile: string,
    targetAspectRatio: number
): Promise<{
    mergedVideo: string,
    fileList: string,
    normalizedClips: string[],
    clipMetadata: Array<{
        originalClip: string,
        normalizedClip: string,
        keyword: string,
        duration: number,
        startTime: number
    }>
}> {
    // Concatenate video clips with precise timing
    const mergedVideo = createSequencedTempFilePath(996, "merged", "mp4");
    const fileList = createSequencedTempFilePath(995, "fileList", "txt");

    // Ensure all clips have the same encoding settings for smooth transitions
    const normalizedClips: string[] = [];
    const clipMetadata: Array<{
        originalClip: string,
        normalizedClip: string,
        keyword: string,
        duration: number,
        startTime: number
    }> = [];

    // Step 1: Normalize all clips for consistent quality
    for (let i = 0; i < processedClips.length; i++) {
        const clipInfo = processedClips[i];
        const normalizedClip = createSequencedTempFilePath(i, `norm-${path.basename(clipInfo.clip)}`, "mp4");
        normalizedClips.push(normalizedClip);

        clipMetadata.push({
            originalClip: clipInfo.clip,
            normalizedClip: normalizedClip,
            keyword: clipInfo.keyword,
            duration: clipInfo.duration,
            startTime: clipInfo.start
        });

        // Determine resolution based on aspect ratio
        const dimensions = getAspectRatioDimensions(targetAspectRatio);
        console.log(`Normalizing clip ${i}: ${clipInfo.clip} -> ${normalizedClip} (${dimensions.sizeOption})`);

        try {
            // Create a new FFmpeg command with explicit input and output
            const command = ffmpeg(clipInfo.clip);

            // Apply video settings
            command.videoCodec("libx264")
                .size(dimensions.sizeOption)
                .audioCodec("aac")
                .outputOptions([
                    "-pix_fmt", "yuv420p",
                    "-profile:v", "main",
                    "-preset", "faster",
                    "-r", "30",
                    "-g", "60",
                    "-b:v", "4000k",
                    "-sar", "1", // Force 1:1 sample aspect ratio for consistent concatenation
                    "-an" // No audio in these clips
                ]);

            // Make sure the output is explicitly set
            command.output(normalizedClip);

            // Execute the command
            await executeFFmpegAsync(
                command,
                normalizedClip,
                `Normalizing clip ${i} to ${dimensions.sizeOption}`
            );
        } catch (error) {
            console.error(`Error normalizing clip ${i} (${clipInfo.clip}):`, error);
            throw new Error(`Clip normalization failed for ${clipInfo.clip}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    // Log the clips used and their order
    logClipsTable(clipMetadata);

    // Write normalized clip list to file for concat
    const clipListForConcat = normalizedClips.map(clip => `file '${clip}'`).join("\n");
    fs.writeFileSync(fileList, clipListForConcat);

    // Step 2: Concatenate all normalized clips with the audio
    await new Promise<void>(async (resolveConcat, rejectConcat) => {
        try {
            // Create a new FFmpeg command
            let concatCommand = ffmpeg();

            // Add normalized clips as inputs
            for (let i = 0; i < normalizedClips.length; i++) {
                concatCommand = concatCommand.input(normalizedClips[i]);
            }

            // Add audio file input last
            concatCommand = concatCommand.input(audioFile);

            // Concat filter for video streams
            // First apply setsar=1 to each input to normalize the Sample Aspect Ratio
            const inputWithSar = Array.from({ length: normalizedClips.length }, (_, i) => `[${i}:v]setsar=1[v${i}];`).join('');
            const processedStreams = Array.from({ length: normalizedClips.length }, (_, i) => `[v${i}]`).join('');
            const filterComplex = `${inputWithSar}${processedStreams}concat=n=${normalizedClips.length}:v=1:a=0[v]`;

            // Audio index is the last input
            const audioInputIndex = normalizedClips.length;

            // Set output options
            concatCommand.complexFilter(filterComplex)
                .outputOptions([
                    "-map", "[v]", // Use the video output from the complex filter
                    "-map", `${audioInputIndex}:a`, // Use the audio from the last input
                    "-c:v", "libx264",
                    "-c:a", "aac"
                ])
                .output(mergedVideo);

            console.log(`Concatenating ${normalizedClips.length} clips with audio to ${mergedVideo}`);

            // Execute the command
            await executeFFmpegAsync(
                concatCommand,
                mergedVideo,
                "Clip concatenation"
            );

            console.log(`Final merged video saved to: ${mergedVideo}`);

            // Record and log the final clip sequence for better debugging
            fs.writeFileSync(
                createSequencedTempFilePath(994, "clip-sequence", "json"),
                JSON.stringify(clipMetadata, null, 2)
            );

            resolveConcat();
        } catch (err) {
            console.error("Error concatenating clips:", err);
            rejectConcat(err);
        }
    });
    cleanupFiles(processedClips.map(clip => clip.clip));
    return {
        mergedVideo,
        fileList,
        normalizedClips,
        clipMetadata
    };
}

/**
 * Apply subtitles to a video. Optional captionMemories (e.g. from Mem0) can influence styling.
 */
export async function applySubtitles(
    baseVideoPath: string,
    speechMarks: SpeechMark[],
    aspectRatio: string = "16:9",
    language: LocaleCode,
    captionMemories?: string[]
): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
        try {
            const finalVideo = createOutputFilePath("output", "mp4");
            ensureOutputDirExists(finalVideo);

            // Step 1: Get video metadata
            const metadata = await ffProbeAsync(baseVideoPath);
            if (!metadata.format || !metadata.format.duration) {
                throw new Error("Invalid video metadata");
            }

            const totalDuration = metadata.format.duration;

            // Step 2: Generate captions
            let captionsFile: string | null = null;
            if (speechMarks.length > 0) {
                captionsFile = await generateFancyCaptions(totalDuration, speechMarks);
            }

            // Step 3: Apply captions to video (with optional styling from memories)
            if (captionsFile && fs.existsSync(captionsFile)) {
                await addCaptionsToVideo(baseVideoPath, captionsFile, finalVideo, aspectRatio, language, captionMemories);

                // Clean up caption file
                if (fs.existsSync(captionsFile)) {
                    fs.unlinkSync(captionsFile);
                }
            } else {
                // If no captions, just copy the video
                fs.copyFileSync(baseVideoPath, finalVideo);
            }

            resolve(finalVideo);
        } catch (error) {
            console.error("Error applying subtitles:", error);
            reject(error);
        }
    });
} 