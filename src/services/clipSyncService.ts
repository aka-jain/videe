import { modelsToUse, openai } from "../config";
import { isStopWord } from "../utils";
import { processClip } from "./videoService";
import { logKeywordExtraction } from "../utils/llmLogger";
import { SpeechMark } from "../types";
import { ClipTiming } from "../types/generation";


/**
 * Extract highly visual and semantically rich keywords from text using LLM
 * This leverages OpenAI to understand the visual concepts in the text 
 * @param text The text to extract visual keywords from
 * @param existingKeywords Optional existing keywords to consider
 * @param fullContext Optional full script to provide more context
 * @param preventRepetition Whether to avoid keywords similar to recently used ones
 */
export async function extractVisualKeywordsWithLLM(
    text: string,
    existingKeywords: string[] = [],
    fullContext: string = "",
): Promise<{ extractedKeywords: string[], keywordType: 'search' | 'stock' }> {
    try {
        const systemPrompt = `
        You are a professional cinematographer and visual storyteller specialized in translating written text into compelling visual scenes.
        Your expertise is finding visually rich and concise search terms for stock footage that perfectly captures the mood,
        setting, action, and emotion of text segments.
        
        Your task is to analyze text and determine:
        1. IF the text refers to a SPECIFIC person, event, or location that requires an EXACT photo and which can not be visualized using generic stock footage (e.g., "Elon Musk", "World Cup Final 2022", "Eiffel Tower") 
        2. OR if the text can be visualized using generic stock footage (e.g., "business meeting", "sports event", "cityscape")
        
        Guidelines:
        - If the content requires specific identifiable elements, mark contentType as "search" and provide specific search terms to find those exact images online
        - If generic stock footage would work well, mark contentType as "stock" and provide concise keywords that would work well with stock footage providers like Pexels
        - For stock footage, prioritize concrete visual elements over abstract concepts
        - Use short, concise terms that work well as search queries
        - Consider the full context of the script when extracting keywords
        - Extract keywords in English regardless of input text language
        - AVOID keywords similar to the recently used ones: ${existingKeywords.join(', ')}
        ${fullContext ? `\nFULL SCRIPT CONTEXT (for additional understanding): "${fullContext}"` : ''}
        
        Return ONLY a JSON object with:
        - "keywords": Array of search terms (Specific search query for 'search' type or concise stock footage keywords for 'stock' type)
        - "contentType": Either "search" (for specific photos) or "stock" (for generic footage)
        
        Example for stock footage: {"keywords": ["modern office", "business meeting", "corporate"], "contentType": "stock"}
        Example for specific photos: {"keywords": ["Elon Musk SpaceX presentation", "Tesla CEO"], "contentType": "search"}
        `;

        const userPrompt = `
        TEXT TO ANALYZE: "${text}"
        
        ${existingKeywords.length > 0 ? `\nCONSIDER THESE EXISTING KEYWORDS: ${existingKeywords.join(', ')}` : ''}
        ${existingKeywords.length > 0 ? `\nAVOID THESE RECENTLY USED KEYWORDS/CONCEPTS: ${existingKeywords.join(', ')}` : ''}
            
        DETERMINE IF THIS CONTENT REQUIRES:
        1. SPECIFIC PHOTO: Does the text mention a specific person, event, or place that can only be shown with an exact photo? (e.g., "Barack Obama", "Wimbledon 2023", "Statue of Liberty")
        2. STOCK FOOTAGE: Can the text be visualized with generic footage? (e.g., "business meeting", "tennis match", "New York skyline")
        
        FOR STOCK FOOTAGE (if appropriate):
        - Provide 3-5 concise keywords optimized for stock footage providers like Pexels
        - Focus on visual elements like subjects, settings, lighting, and camera angles
        - Example good stock keywords: "aerial forest sunset", "hands typing keyboard", "slow motion ocean waves", "a monk walking in the mud"
        
        FOR SPECIFIC PHOTOS (if required):
        - Provide 2-3 specific search queries that would find the exact photos needed online
        - Be very specific and avoid generic terms
        - Example good search queries: "Elon Musk SpaceX presentation", "Taylor Swift Eras Tour 2023", "KL Rahul batting in IPL 2025"

        IMPORTANT:
        - Your default choice should be search queries, but if truely feel stock footage addition will create the best video, then choose stock.
        
        Return only a JSON object with format: 
        {"keywords": ["term1", "term2"], "contentType": "search" or "stock"}
        `;

        const response = await openai.chat.completions.create({
            model: modelsToUse.generateKeyWords,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.7,
            response_format: { type: "json_object" },
            max_tokens: 200
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
            const parsed = JSON.parse(content);

            if (parsed.keywords && Array.isArray(parsed.keywords) && parsed.keywords.length > 0 &&
                (parsed.contentType === 'stock' || parsed.contentType === 'search')) {

                const extractedKeywords: string[] = parsed.keywords;
                const keywordType: 'search' | 'stock' = parsed.contentType;


                // Log the keyword extraction inputs and outputs
                logKeywordExtraction(
                    text,
                    existingKeywords,
                    fullContext,
                    extractedKeywords
                );

                return { extractedKeywords, keywordType };
            }
            throw new Error("Invalid response format: missing keywords or contentType");
        }
        throw new Error("No content found in the response");
    } catch (error) {
        console.error("Error using LLM for keyword extraction:", error);
        throw error;
    }
}

/**
 * Extract keywords from text and add clip timing
 */
export async function addClipTimingWithKeywords(
    text: string,
    startTime: number,
    duration: number,
    fullScript: string,
    timings: ClipTiming[]
): Promise<void> {
    console.log(`Processing text segment: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

    // First check if any existing keywords match the text
    let matchingKeywords: string[] = timings.map(timing => timing.keyword);
    let keywordType: 'search' | 'stock' = 'search';

    try {
        // Use LLM to extract visual keywords from this text, providing full script context
        const { extractedKeywords, keywordType: newKeywordType } = await extractVisualKeywordsWithLLM(
            text,
            matchingKeywords,
            fullScript
        );

        matchingKeywords = extractedKeywords;
        keywordType = newKeywordType;
    } catch (error) {
        console.error("Error using LLM for visual keyword extraction:", error);
        // Simple fallback extraction
        const words: string[] = text.match(/\b(\w+)\b/g) || [];
        const importantWords = words.filter(word =>
            word.length > 4 && !isStopWord(word.toLowerCase())
        );

        if (importantWords.length > 0) {
            matchingKeywords = importantWords.slice(0, 3);
        } else {
            matchingKeywords = [text.split(' ').slice(0, 2).join(' ')]; // Limit to 2 words
        }
    }

    // Add the best keywords with timing information
    if (matchingKeywords.length > 0) {
        console.log(`Adding clip timing with keyword: "${matchingKeywords[0]}" (${startTime.toFixed(2)}s - ${duration.toFixed(2)}s)`);

        timings.push({
            keyword: matchingKeywords.join(','),
            keywordType: keywordType,
            sentenceText: text,
            startTime,
            duration
        });
    }
}

/**
 * Process a batch of clip timings
 */
export async function processBatch(
    generationId: string,
    userId: string,
    batch: ClipTiming[],
    targetAspectRatio: number,
    processedClipsCount: number,
    scriptText: string,
    selectedVideos: string[]
): Promise<Array<{ clip: string, keyword: string, start: number, duration: number, actualDuration: number }>> {
    const results: Array<{ clip: string, keyword: string, start: number, duration: number, actualDuration: number }> = [];

    // Process each keyword in parallel within the batch
    const promises = batch.map(async (timing) => {
        try {
            // We'll need to import and call processClip from videoService
            // This function will need to be moved to videoService first
            const result = await processClip(
                generationId,
                userId,
                timing,
                targetAspectRatio,
                selectedVideos,
                processedClipsCount + results.length,
                scriptText // Pass the full script as context
            );

            if (result) {
                return {
                    clip: result.clipPath,
                    keyword: result.keyword, // Use the keyword from the result
                    start: timing.startTime,
                    duration: timing.duration,
                    actualDuration: result.actualDuration
                };
            }
            return null;
        } catch (error) {
            console.error(`Error processing clip for "${timing.keyword}":`, error);
            return null;
        }
    });

    const batchResults = await Promise.all(promises);
    results.push(...batchResults.filter(r => r !== null) as typeof results);
    return results;
}

/**
 * Process all word marks in one shot using LLM
 * @param wordMarks Speech marks with timing information
 * @param maxClipDuration Maximum duration for each clip
 * @param script Full script text
 * @returns Array of ClipTiming objects or null if processing fails
 */
export async function processWordMarksWithLLM(
    wordMarks: SpeechMark[],
    maxClipDuration: number,
    script: string
): Promise<ClipTiming[] | null> {
    try {
        // Prepare the input data for the LLM
        const wordMarksForLLM = wordMarks.map(mark => ({
            word: mark.value,
            time: mark.time / 1000, // Convert to seconds
            duration: (mark.duration || 500) / 1000 // Convert to seconds
        }));

        const systemPrompt = `
        You are a professional cinematographer and visual storyteller specialized in translating spoken text into compelling visual scenes.
        Your task is to segment a sequence of words (with their timing information) into logical segments for video generation.

        For each segment:
        1. Determine if it requires specific photos (contentType: "search") or generic stock footage (contentType: "stock")
        2. Extract visually rich keywords that would make good search terms for finding appropriate visuals
        3. Calculate the start time and duration based on the word timing information

        Guidelines:
        - Each segment should be at most ${maxClipDuration} seconds long
        - Segments should form natural phrases or sentences when possible
        - Each segment needs visual keywords that capture the essence of what's being said
        - Default to "search" contentType unless stock footage would clearly work better
        - Keywords should be concise, descriptive, and optimized for visual search
        `;

        const userPrompt = `
        FULL SCRIPT: "${script}"
        
        WORD TIMING DATA (in seconds):
        ${JSON.stringify(wordMarksForLLM, null, 2)}
        
        Create logical segments from these words, with each segment having:
        1. sentenceText: The text content of the segment
        2. keyword: Comma-separated visually rich keywords that best represent this segment for finding stock footage/images
        3. keywordType: Either "search" (for specific images) or "stock" (for generic footage)
        4. startTime: When this segment starts in seconds
        5. duration: How long this segment lasts in seconds

        IMPORTANT:
        1. Make sure to cover the entire script.
        2. Make sure there are no gaps or overlaps between segments.
        3. Make sure that the script is covered in a continuous manner.

        Try to make each segment be at least 1 second long and not more than ${maxClipDuration} seconds.
        
        Return ONLY a JSON object with this format:
        {
          "segments": [
            {
              "sentenceText": "Critiano Ronaldo is a football player",
              "keyword": "Critiano Ronaldo football, Cristiano Ronaldo playing football",
              "keywordType": "search",
              "startTime": 0.5,
              "duration": 2.3
            },
            {
              "sentenceText": "Who has done great on the pitch.",
              "keyword": "man with trophy, happy man",
              "keywordType": "stock",
              "startTime": 2.8,
              "duration": 1.5
            },
            ... more segments ...
          ]
        }
        `;

        const response = await openai.chat.completions.create({
            model: modelsToUse.generateKeyWordsInOneShot,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" },
            max_completion_tokens: 10000
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error("No content found in the response");
        }

        const parsed = JSON.parse(content);

        // Validate the response format
        if (!parsed.segments || !Array.isArray(parsed.segments) || parsed.segments.length === 0) {
            throw new Error("Invalid response format: missing segments array");
        }

        // Validate each segment
        for (const segment of parsed.segments) {
            if (!segment.sentenceText || typeof segment.sentenceText !== 'string' ||
                !segment.keyword || typeof segment.keyword !== 'string' ||
                !segment.keywordType || (segment.keywordType !== 'search' && segment.keywordType !== 'stock') ||
                typeof segment.startTime !== 'number' || typeof segment.duration !== 'number') {
                throw new Error("Invalid segment format in response");
            }
        }

        // Validate coverage of the entire wordMarks array
        const firstWordTime = wordMarks[0].time / 1000; // Convert to seconds
        const lastWordTime = (wordMarks[wordMarks.length - 1].time / 1000) + (wordMarks[wordMarks.length - 1].duration / 1000);

        // Check full timeline coverage and continuity between segments
        for (let i = 0; i < parsed.segments.length - 1; i++) {
            const currentSegment = parsed.segments[i];
            const nextSegment = parsed.segments[i + 1];

            // Check for gaps or overlaps between segments (allowing 0.1s tolerance)
            const segmentEndTime = currentSegment.startTime + currentSegment.duration;
            const timeDifference = Math.abs(segmentEndTime - nextSegment.startTime);

            if (timeDifference > 0.1) {
                throw new Error(`Gap or overlap detected between segments ${i} and ${i + 1}`);
            }

            // Verify reasonable segment duration
            if (currentSegment.duration < 0.5 || currentSegment.duration > maxClipDuration + 0.5) {
                throw new Error(`Segment ${i} has invalid duration: ${currentSegment.duration}s`);
            }
        }

        // Check overall coverage
        const firstSegmentTime = parsed.segments[0].startTime;
        const lastSegmentTime = parsed.segments[parsed.segments.length - 1].startTime + parsed.segments[parsed.segments.length - 1].duration;

        if (Math.abs(firstSegmentTime - firstWordTime) > 0.1 || Math.abs(lastSegmentTime - lastWordTime) > 0.1) {
            throw new Error("Response doesn't cover the entire speech duration");
        }

        return parsed.segments as ClipTiming[];
    } catch (error) {
        console.error("Error processing word marks with LLM:", error);
        return null;
    }
}

export async function processWordMarksIntoSegments(
    wordMarks: SpeechMark[],
    maxClipDuration: number,
    script: string,
    clipTimings: ClipTiming[]
): Promise<void> {
    // Try the one-shot LLM approach first
    // const llmTimings = await processWordMarksWithLLM(wordMarks, maxClipDuration, script);

    // if (llmTimings && llmTimings.length > 0) {
    //     // LLM approach succeeded, add the timings to the clipTimings array
    //     console.log(`Successfully processed ${llmTimings.length} segments with one-shot LLM approach`);
    //     clipTimings.push(...llmTimings);
    //     return;
    // }

    // Fallback to the original approach if LLM approach failed
    // console.log("Falling back to sequential processing approach");

    let currentSegmentStart = 0;
    let currentSegmentWords: SpeechMark[] = [];

    for (let i = 0; i < wordMarks.length; i++) {
        const currentWord = wordMarks[i];
        const wordStartTime = currentWord.time / 1000;

        if (currentSegmentWords.length === 0) {
            // Start a new segment
            currentSegmentStart = wordStartTime;
            currentSegmentWords.push(currentWord);
        } else {
            // Check if adding this word would exceed the max duration
            if (wordStartTime - currentSegmentStart < maxClipDuration) {
                // Add to current segment
                currentSegmentWords.push(currentWord);
            } else {
                // Complete current segment and start a new one
                const segmentText = currentSegmentWords.map(word => word.value).join(' ');
                const segmentDuration = wordStartTime - currentSegmentStart;

                // Extract keywords and add clip timing
                await addClipTimingWithKeywords(segmentText, currentSegmentStart, segmentDuration, script, clipTimings);

                // Start new segment with current word
                currentSegmentStart = wordStartTime;
                currentSegmentWords = [currentWord];
            }
        }

        // Handle the last segment or if we're at the last word
        if (i === wordMarks.length - 1 && currentSegmentWords.length > 0) {
            const segmentText = currentSegmentWords.map(word => word.value).join(' ');
            const lastWordEndTime = (currentWord.time + (currentWord.duration || 500)) / 1000 + 0.3;
            const segmentDuration = lastWordEndTime - currentSegmentStart;

            // Extract keywords and add clip timing
            await addClipTimingWithKeywords(segmentText, currentSegmentStart, segmentDuration, script, clipTimings);
        }
    }
}