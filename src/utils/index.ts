import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

/**
 * Ensure that required directories exist
 */
export function ensureDirectoriesExist(): void {
    const requiredDirs = ['./temp', './output'];

    requiredDirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`Created directory: ${dir}`);
        }
    });
}

/**
 * Generate a unique filename with the given prefix
 */
export function generateUniqueFilename(prefix: string, extension: string): string {
    return `${prefix}_${uuidv4()}.${extension}`;
}

/**
 * Create a temporary file path in the temp directory
 */
export function createTempFilePath(prefix: string, extension: string): string {
    ensureDirectoriesExist(); // Ensure the temp directory exists
    const filename = generateUniqueFilename(prefix, extension);
    return path.join("./temp", filename);
}

/**
 * Create an output file path in the output directory
 */
export function createOutputFilePath(prefix: string, extension: string): string {
    ensureDirectoriesExist(); // Ensure the output directory exists 
    const filename = generateUniqueFilename(prefix, extension);
    return path.join("./output", filename);
}

/**
 * Function to clean up temporary files
 */
export function cleanupFiles(files: string[]): void {
    files.forEach((file) => {
        if (fs.existsSync(file)) {
            fs.unlink(file, (err) => {
                if (err) {
                    console.error("Error deleting file:", file, err);
                } else {
                    console.log("Deleted file:", file);
                }
            });
        }
    });
}

/**
 * Check if a word is a stop word (common words with little semantic value)
 */
export function isStopWord(word: string): boolean {
    const stopWords = [
        "the", "and", "is", "in", "to", "a", "of", "that", "with",
        "as", "for", "on", "by", "it", "at", "from", "this", "was",
        "be", "have", "has", "had", "are", "an", "but", "or", "so",
        "what", "when", "where", "which", "who", "how", "they", "them",
        "their", "there", "here", "you", "your", "we", "our", "us",
    ];
    return stopWords.includes(word.toLowerCase());
}

// Track temporary files for cleanup
const tempFiles: string[] = [];

/**
 * Track and cleanup temporary files
 * @param filePath The file path to track for cleanup
 * @returns The same file path for chaining
 */
export function trackTempFile(filePath: string): string {
    tempFiles.push(filePath);
    return filePath;
}

/**
 * Create sequence-based temp file path
 * @param sequenceNum The sequence number for ordering
 * @param clipName Name to include in the file
 * @param extension File extension
 * @returns Path to the temporary file
 */
export function createSequencedTempFilePath(sequenceNum: number, clipName: string, extension: string): string {
    const tempFilePath = createTempFilePath(`${sequenceNum.toString().padStart(3, '0')}-${clipName}`, extension);
    return trackTempFile(tempFilePath);
}

/**
 * Cleanup function to remove all temporary files
 */
export function cleanupTempFiles(): void {
    for (const file of tempFiles) {
        try {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
            }
        } catch (error) {
            console.error(`Error cleaning up temporary file ${file}:`, error);
        }
    }
    tempFiles.length = 0; // Clear the array
}

/**
 * Ensure output directory exists
 * @param outputPath The path to ensure directory exists for
 */
export function ensureOutputDirExists(outputPath: string): void {
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
        console.log(`Creating output directory: ${outputDir}`);
        fs.mkdirSync(outputDir, { recursive: true });
    }
}

// Export utils from other modules
export * from "./logger";
export * from "./errorHandling";
export * from "./ffmpegUtils";
export * from "./ffmpegPromises";
export * from "./subtitleUtils"; 