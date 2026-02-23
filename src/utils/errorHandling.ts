import { cleanupTempFiles } from "./index";

/**
 * Standardized FFmpeg error handler
 * @param err The error to handle
 * @param processName Name of the process that failed
 * @param cleanup Whether to clean up temp files
 * @returns Error object with formatted message
 */
export function handleFFmpegError(err: any, processName: string, cleanup: boolean = true): Error {
    console.error(`Error in ${processName}:`, err);

    // if (cleanup) {
    //     cleanupTempFiles();
    // }

    return err instanceof Error ? err : new Error(String(err));
} 