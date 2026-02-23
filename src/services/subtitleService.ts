import fs from 'fs';
import { createTempFilePath } from '../utils';
import { SpeechMark } from '../types';
/**
 * Format time in seconds to SRT format (00:00:00,000)
 */
function formatSrtTime(timeInSeconds: number): string {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const milliseconds = Math.floor((timeInSeconds - Math.floor(timeInSeconds)) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
}

/**
 * Generate fancy, short captions with bold text styling
 * Shows no more than 2 words at a time for dramatic effect
 * Uses speech marks for perfect synchronization with audio
 */
export async function generateFancyShortCaptions(
    audioDuration: number,
    speechMarks: SpeechMark[],
): Promise<string> {
    try {
        console.log("Using SRT format for Hindi fancy captions to be rendered with drawtext");
        // Extract word marks for precise word-by-word timing
        const wordMarks = speechMarks.filter(mark => mark.type === 'word');

        if (wordMarks.length === 0) {
            console.warn("No word marks found for Hindi captions, falling back to standard subtitle generation");
            throw new Error("No word marks found for Hindi captions, falling back to standard subtitle generation");
        }

        // Skip articles and very short words when possible
        const skipWords = ['a', 'an', 'the', 'of', 'to', 'in', 'for', 'on', 'at', 'by', 'is', 'are'];

        // Process each word individually
        const wordEntries: Array<{ word: string, startTime: number, endTime: number }> = [];

        for (let i = 0; i < wordMarks.length; i++) {
            const wordMark = wordMarks[i];
            const word = wordMark.value.toLowerCase();

            // Skip articles and short words when possible
            if (skipWords.includes(word) && i < wordMarks.length - 1) {
                continue;
            }

            // Calculate timing for this word
            const startTime = wordMark.time / 1000;
            const endTime = (i < wordMarks.length - 1)
                ? wordMarks[i + 1].time / 1000 - 0.05
                : startTime + 1.5; // Give the last word a bit more time

            // Add to entries if valid
            if (endTime > startTime && startTime < audioDuration) {
                wordEntries.push({
                    word: wordMark.value,
                    startTime,
                    endTime: Math.min(endTime, audioDuration)
                });
            }
        }

        // Create SRT content
        let srtContent = '';

        wordEntries.forEach((entry, index) => {
            const wordText = entry.word.toUpperCase(); // Use uppercase for more impact

            // Format times for SRT
            const formattedStartTime = formatSrtTime(entry.startTime);
            const formattedEndTime = formatSrtTime(entry.endTime);

            // Add subtitle entry
            srtContent += `${index + 1}\n`;
            srtContent += `${formattedStartTime} --> ${formattedEndTime}\n`;
            srtContent += `${wordText}\n\n`;
        });

        // Write SRT file
        const srtFile = createTempFilePath('hindi_fancy_captions', 'srt');
        fs.writeFileSync(srtFile, srtContent, { encoding: 'utf8' });

        return srtFile;
    } catch (error) {
        console.error("Error generating fancy short captions:", error);
        console.log("Falling back to standard subtitle generation");
        throw error;
    }
}

/**
 * Generate fancy subtitles with word-by-word highlighting
 * Optimized for syncing with speech marks
 */
export async function generateFancyCaptions(
    audioDuration: number,
    speechMarks: SpeechMark[],
): Promise<string> {
    try {
        return await generateFancyShortCaptions(audioDuration, speechMarks);
    } catch (error) {
        console.error("Error generating fancy captions:", error);
        throw error;
    }
} 