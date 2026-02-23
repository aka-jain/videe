import ffmpeg from "fluent-ffmpeg";
import { logProcessStart, logProcessProgress, logProcessCompletion } from "./logger";
import { handleFFmpegError } from "./errorHandling";
import { ensureOutputDirExists } from "./index";
import fs from "fs";

/**
 * Promise-based wrapper for ffprobe
 */
export function ffProbeAsync(filePath: string): Promise<ffmpeg.FfprobeData> {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, data) => {
            if (err) {
                console.error("Error probing file metadata:", err);
                reject(err);
                return;
            }
            resolve(data);
        });
    });
}

/**
 * Execute FFmpeg command as a Promise
 */
export function executeFFmpegAsync(
    command: ffmpeg.FfmpegCommand,
    outputPath: string,
    processName: string = "FFmpeg operation"
): Promise<string> {
    return new Promise((resolve, reject) => {
        // Validate that we have an output path
        if (!outputPath || outputPath.trim() === "") {
            return reject(new Error(`${processName} failed: No output path specified`));
        }

        // Ensure output directory exists
        ensureOutputDirExists(outputPath);

        const startTime = Date.now();

        console.log(`Starting ${processName} to output: ${outputPath}`);

        try {
            // Check if the command has an output specified
            const hasOutput = Boolean((command as any)._outputs && (command as any)._outputs.length > 0);

            if (!hasOutput) {
                console.error(`Error: FFmpeg command does not have an output specified for ${outputPath}`);
                return reject(new Error(`${processName} failed: FFmpeg command missing output configuration`));
            }

            command
                .on("start", (commandLine) => {
                    logProcessStart(processName, commandLine);
                })
                .on("progress", (progress) => {
                    logProcessProgress(progress);
                })
                .on("end", () => {
                    logProcessCompletion(processName, startTime);

                    // Verify the output file exists and has a reasonable size
                    if (fs.existsSync(outputPath)) {
                        try {
                            const stats = fs.statSync(outputPath);
                            const fileSizeMB = stats.size / (1024 * 1024);
                            console.log(`Output file ${outputPath} created successfully (${fileSizeMB.toFixed(2)} MB)`);

                            if (fileSizeMB < 0.01) {
                                console.warn(`WARNING: Output file size is suspiciously small (${fileSizeMB.toFixed(2)} MB)`);
                            }
                        } catch (statErr) {
                            console.warn(`Warning: Could not get file stats for ${outputPath}:`, statErr);
                        }
                    } else {
                        console.warn(`WARNING: Output file ${outputPath} does not exist after FFmpeg finished`);
                    }

                    resolve(outputPath);
                })
                .on("error", (err, stdout, stderr) => {
                    console.error(`${processName} failed for output ${outputPath}:`, stdout, stderr);
                    reject(handleFFmpegError(err, processName, false));
                })
                .run();
        } catch (error) {
            console.error(`Unexpected error in executeFFmpegAsync:`, error);
            reject(new Error(`${processName} failed: ${error instanceof Error ? error.message : String(error)}`));
        }
    });
}

/**
 * Execute a standard FFmpeg command with proper event handlers
 */
export function executeFFmpegCommand(
    ffmpegCommand: ffmpeg.FfmpegCommand,
    outputPath: string,
    processName: string = "FFmpeg operation",
    onSuccess: (path: string) => void,
    onError: (error: Error) => void,
    cleanup: boolean = true
): void {
    const startTime = Date.now();

    // Ensure output directory exists
    ensureOutputDirExists(outputPath);

    ffmpegCommand
        .on("start", (commandLine) => {
            logProcessStart(processName, commandLine);
        })
        .on("progress", (progress) => {
            logProcessProgress(progress);
        })
        .on("end", () => {
            logProcessCompletion(processName, startTime);
            onSuccess(outputPath);
        })
        .on("error", (err) => {
            onError(handleFFmpegError(err, processName, cleanup));
        })
        .run();
} 