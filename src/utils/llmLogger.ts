import fs from 'fs';
import path from 'path';

// Define log file paths
const LOG_DIR = path.join(process.cwd(), 'logs');
const KEYWORD_EXTRACTION_LOG = path.join(LOG_DIR, 'keyword_extraction.log');
const VIDEO_SELECTION_LOG = path.join(LOG_DIR, 'video_selection.log');

/**
 * Ensure log directory exists
 */
function ensureLogDirExists(): void {
    if (!fs.existsSync(LOG_DIR)) {
        try {
            fs.mkdirSync(LOG_DIR, { recursive: true });
        } catch (err) {
            console.error("Failed to create log directory:", err);
        }
    }
}

/**
 * Log LLM keyword extraction inputs and outputs
 */
export function logKeywordExtraction(
    text: string,
    existingKeywords: string[] = [],
    fullContext: string = "",
    extractedKeywords: string[] = []
): void {
    ensureLogDirExists();

    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        inputs: {
            text,
            existingKeywords,
            fullContext: fullContext ? fullContext.substring(0, 200) + (fullContext.length > 200 ? '...' : '') : '',
        },
        outputs: {
            extractedKeywords
        }
    };

    fs.appendFileSync(
        KEYWORD_EXTRACTION_LOG,
        JSON.stringify(logEntry, null, 2) + '\n---\n',
        { encoding: 'utf8' }
    );

    console.log(`Logged keyword extraction for: "${text.substring(0, 50)}..."`);
}

/**
 * Log LLM video selection inputs and outputs
 */
export function logVideoSelection(
    scriptSegment: string,
    candidateVideos: Array<any>,
    fullScriptContext: string = "",
    selectedVideo: any
): void {
    ensureLogDirExists();

    const timestamp = new Date().toISOString();

    // Create a simplified version of candidateVideos to avoid huge log files
    const simplifiedCandidates = candidateVideos.map(video => ({
        id: video.id,
        title: video.title,
        description: video.description ? video.description.substring(0, 100) : '',
        tags: video.tags,
        duration: video.duration,
        aspectRatio: video.aspectRatio
    }));

    // Simplify selected video info
    const simplifiedSelectedVideo = selectedVideo ? {
        id: selectedVideo.id,
        title: selectedVideo.title,
        description: selectedVideo.description ? selectedVideo.description.substring(0, 100) : '',
        tags: selectedVideo.tags,
        duration: selectedVideo.duration,
        aspectRatio: selectedVideo.aspectRatio
    } : null;

    const logEntry = {
        timestamp,
        inputs: {
            scriptSegment,
            candidateCount: candidateVideos.length,
            fullScriptContext: fullScriptContext ? fullScriptContext.substring(0, 200) + (fullScriptContext.length > 200 ? '...' : '') : '',
            candidateVideos: simplifiedCandidates
        },
        outputs: {
            selectedVideo: simplifiedSelectedVideo
        }
    };

    fs.appendFileSync(
        VIDEO_SELECTION_LOG,
        JSON.stringify(logEntry, null, 2) + '\n---\n',
        { encoding: 'utf8' }
    );

    console.log(`Logged video selection for: "${scriptSegment.substring(0, 50)}..."`);
} 