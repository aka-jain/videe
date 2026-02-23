import ffmpeg from "fluent-ffmpeg";

/**
 * Apply standard video codec options to an FFmpeg command
 */
export function createVideoCodecOptions(command: ffmpeg.FfmpegCommand, highQuality: boolean = false): ffmpeg.FfmpegCommand {
    return command
        .videoCodec("libx264")
        .outputOptions([
            "-pix_fmt", "yuv420p",
            "-profile:v", "main",
            "-preset", highQuality ? "medium" : "faster",
            "-r", "30",
            "-g", "60",
            "-b:v", highQuality ? "6000k" : "4000k",
        ]);
}

/**
 * Create an audio mixing filter complex string for combining audio streams
 */
export function createAudioMixingFilter(videoInputIndex: number, musicInputIndex: number, voiceVolume: number = 1.0, musicVolume: number = 0.1): string {
    return `[${videoInputIndex}:a]volume=${voiceVolume}[a1];[${musicInputIndex}:a]volume=${musicVolume}[a2];[a1][a2]amix=inputs=2:duration=first[aout]`;
}

/**
 * Calculate dimensions based on target aspect ratio
 */
export function getAspectRatioDimensions(targetAspectRatio: number, baseResolution: number = 1080): { width: number, height: number, sizeOption: string } {
    let targetWidth, targetHeight;

    if (targetAspectRatio >= 1) {
        // Landscape or square (e.g., 16:9, 4:3, 1:1)
        targetHeight = baseResolution;
        targetWidth = Math.round(baseResolution * targetAspectRatio);
        // Ensure width is even (required by some codecs)
        targetWidth = targetWidth % 2 === 0 ? targetWidth : targetWidth + 1;
    } else {
        // Portrait (e.g., 9:16)
        targetWidth = baseResolution;
        targetHeight = Math.round(baseResolution / targetAspectRatio);
        // Ensure height is even
        targetHeight = targetHeight % 2 === 0 ? targetHeight : targetHeight + 1;
    }

    return {
        width: targetWidth,
        height: targetHeight,
        sizeOption: `${targetWidth}x${targetHeight}`
    };
}

/**
 * Parse an aspect ratio string (e.g., "16:9") into a numeric ratio
 */
export function parseAspectRatio(aspectRatio: string, defaultRatio: number = 16 / 9): number {
    if (aspectRatio) {
        const [width, height] = aspectRatio.split(':').map(Number);
        if (width && height && !isNaN(width) && !isNaN(height)) {
            return width / height;
        }
        console.warn(`Invalid aspect ratio format: ${aspectRatio}, using default 16:9`);
    }
    return defaultRatio;
}

/**
 * Calculate subtitle styling parameters based on video aspect ratio
 */
export function calculateSubtitleStyling(aspectRatio: string): {
    fontSize: number;
    marginV: number;
    lineSpacing: number;
} {
    let fontSize = 36;
    let marginV = 35;
    let lineSpacing = 0.2;

    if (aspectRatio) {
        const [width, height] = aspectRatio.split(':').map(Number);
        if (!isNaN(width) && !isNaN(height) && height > 0) {
            const videoAspect = width / height;

            if (videoAspect < 1) {
                // Portrait video (e.g., 9:16)
                fontSize = 18;
                marginV = 24;
                lineSpacing = 0.1;
                console.log("Using portrait subtitle styling");
            } else if (videoAspect < 1.5) {
                // Square-ish or 4:3 video
                fontSize = 32;
                marginV = 32;
                console.log("Using 4:3 subtitle styling");
            } else {
                // Standard widescreen or wider
                console.log("Using widescreen subtitle styling");
            }
        }
    }

    return { fontSize, marginV, lineSpacing };
} 