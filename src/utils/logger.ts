import path from "path";

/**
 * Log the start of a processing operation
 */
export function logProcessStart(processName: string, commandLine?: string): void {
    console.log(`${processName} started${commandLine ? ` with command: ${commandLine}` : ''}`);
}

/**
 * Log progress of an FFmpeg operation
 */
export function logProcessProgress(progress: { percent?: number }): void {
    if (progress.percent && progress.percent % 10 < 1) {
        console.log(`Processing: ${Math.round(progress.percent)}% done`);
    }
}

/**
 * Log successful completion of a process with timing information
 */
export function logProcessCompletion(processName: string, startTime: number): void {
    const endTime = Date.now();
    const processingTimeSeconds = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`Successfully completed ${processName}. Processing time: ${processingTimeSeconds}s`);
}

/**
 * Log a formatted table of clips used in the final video
 */
export function logClipsTable(clipMetadata: Array<{
    originalClip: string,
    normalizedClip: string,
    keyword: string,
    duration: number,
    startTime: number
}>): void {
    console.log("\n=== CLIPS USED IN FINAL VIDEO ===");
    console.log("Seq | Clip Name | Keyword | Start Time | Duration");
    console.log("-------------------------------------------------");
    clipMetadata.forEach((clip, index) => {
        console.log(
            `${index.toString().padStart(3, '0')} | ${path.basename(clip.originalClip)} | ${clip.keyword} | ${clip.startTime.toFixed(2)}s | ${clip.duration.toFixed(2)}s`
        );
    });
    console.log("=== END OF CLIPS LIST ===\n");
} 