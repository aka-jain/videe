import axios from "axios";
import fs from "fs";
import tmp from "tmp";
import { polly, JAMENDO_CLIENT_ID } from "../config";
import { v4 as uuidv4 } from "uuid";
import ffmpeg from "fluent-ffmpeg";
import { JamendoResponse, SpeechMark } from "../types";
import { SynthesizeSpeechInput } from "aws-sdk/clients/polly";
import { LocaleCode, VoiceId, getPollyVoiceParams } from "../config/languages";
import AWS from "aws-sdk";

// Initialize S3 client
const s3 = new AWS.S3();

/**
 * Generate a presigned URL from an S3 URL for secure access
 * @param s3Url - The permanent S3 URL (e.g., from uploadResult.Location)
 * @param expiresInSeconds - Expiration time in seconds (default: 24 hours)
 * @returns Presigned URL for secure access
 */
export function generatePresignedUrl(s3Url: string, expiresInSeconds: number = 24 * 60 * 60): string {
    try {
        // Parse the S3 URL to extract bucket and key
        const url = new URL(s3Url);
        let bucket: string;
        let key: string;

        // Handle different S3 URL formats
        if (url.hostname.includes('.s3.')) {
            // Format: https://bucket.s3.region.amazonaws.com/key
            bucket = url.hostname.split('.')[0];
            key = url.pathname.substring(1); // Remove leading slash
        } else if (url.hostname.startsWith('s3.')) {
            // Format: https://s3.region.amazonaws.com/bucket/key
            const pathParts = url.pathname.substring(1).split('/');
            bucket = pathParts[0];
            key = pathParts.slice(1).join('/');
        } else {
            throw new Error('Invalid S3 URL format');
        }

        // Generate presigned URL
        const presignedUrl = s3.getSignedUrl('getObject', {
            Bucket: bucket,
            Key: key,
            Expires: expiresInSeconds
        });

        return presignedUrl;
    } catch (error) {
        console.error('Error generating presigned URL:', error);
        throw new Error('Failed to generate presigned URL');
    }
}

/**
 * Generate voice over for the script using Amazon Polly and upload to S3
 */
export async function generateVoiceOver(
    script: string,
    generationId: string,
    userId: string,
    localeCode: LocaleCode,
    voiceId: VoiceId
): Promise<string> {
    // Get Polly params with the provided language
    const params = getPollyVoiceParams(script, localeCode, voiceId);

    return new Promise<string>((resolve, reject) => {
        polly.synthesizeSpeech(params, async (err, data) => {
            if (err) {
                console.error("Error calling Amazon Polly:", err);
                reject(err);
            } else if (data && data.AudioStream instanceof Buffer) {
                const audioFileName = `voice_${uuidv4()}.mp3`;
                const s3Key = `${userId}/${generationId}/voiceover/${audioFileName}`;

                // Determine bucket name from environment or use fallback
                const bucketName = process.env.S3_CACHE_BUCKET || 'video-gennie-cache';

                const s3Params = {
                    Bucket: bucketName,
                    Key: s3Key,
                    Body: data.AudioStream,
                    ContentType: 'audio/mpeg'
                };

                try {
                    // Upload to S3
                    const uploadResult = await s3.upload(s3Params).promise();
                    console.log("Audio content uploaded to S3:", s3Key);

                    // Return the S3 URL (not presigned)
                    resolve(uploadResult.Location);
                } catch (uploadError) {
                    console.error("Error uploading audio file to S3:", uploadError);
                    reject(uploadError);
                }
            } else {
                reject(new Error("Unexpected response from Amazon Polly"));
            }
        });
    });
}

/**
 * Generate speech marks using Amazon Polly for accurate subtitle synchronization
 * Returns an array of word timing data that can be used to precisely time subtitles
 */
export async function generateSpeechMarks(script: string, localeCode: LocaleCode, voiceId: VoiceId): Promise<SpeechMark[]> {
    // Get language configuration

    const params: SynthesizeSpeechInput = {
        Text: script,
        LanguageCode: localeCode,
        OutputFormat: "json",
        VoiceId: voiceId, // Match the voice used in audio generation
        Engine: "neural",
        SpeechMarkTypes: ["word", "sentence"]
    };

    return new Promise<SpeechMark[]>((resolve, reject) => {
        polly.synthesizeSpeech(params, (err, data) => {
            if (err) {
                console.error("Error calling Amazon Polly for speech marks:", err);
                reject(err);
            } else if (data && data.AudioStream) {
                // Speech marks come as a series of JSON objects, one per line
                const speechMarksStr = data.AudioStream.toString();
                try {
                    // Parse the speech marks - each line is a separate JSON object
                    const speechMarks = speechMarksStr
                        .split('\n')
                        .filter(line => line.trim().length > 0)
                        .map(line => JSON.parse(line));

                    console.log(`Generated ${speechMarks.length} speech marks for synchronization`);
                    resolve(speechMarks);
                } catch (parseError) {
                    console.error("Error parsing speech marks:", parseError);
                    reject(parseError);
                }
            } else {
                reject(new Error("Unexpected response from Amazon Polly for speech marks"));
            }
        });
    });
}

/**
 * Fetch background music based on the script's mood and upload to S3
 */
export async function fetchBackgroundMusic(mood: string, generationId: string, userId: string): Promise<string | null> {
    // Determine mood of the script to select appropriate music

    const categories: Record<string, string> = {
        happy: "happy cheerful upbeat positive",
        sad: "sad emotional melancholic",
        exciting: "epic action cinematic energetic",
        calm: "ambient calm peaceful relaxing",
        mysterious: "mysterious suspense dark",
        inspirational: "inspirational motivational",
        neutral: "background corporate technology",
    };

    // Default to neutral if mood not found
    const searchTags = categories[mood.toLowerCase()] || categories.neutral;

    try {
        // Jamendo API endpoint
        const response = await axios.get<JamendoResponse>("https://api.jamendo.com/v3.0/tracks/", {
            params: {
                client_id: JAMENDO_CLIENT_ID,
                format: "json",
                limit: 5,
                include: "musicinfo",
                fuzzytags: "instrumental+" + searchTags.split(" ").join("+"),
                audioformat: "mp32",
                boost: "popularity_total",
            },
        });

        console.log("Jamendo API response status:", response.status);

        if (
            response.data &&
            response.data.results &&
            response.data.results.length > 0
        ) {

            // Select a track
            const selectedTrack = response.data.results[0];

            // Get the audio URL
            const audioUrl = selectedTrack.audio;

            if (!audioUrl) {
                console.error("Could not find audio URL in the Jamendo API response");
                return null;
            }

            console.log("Selected audio URL:", audioUrl);

            // Generate unique filename for S3
            const musicFileName = `music_${uuidv4()}.mp3`;
            const s3Key = `${userId}/${generationId}/background-music/${musicFileName}`;

            // Determine bucket name from environment or use fallback
            const bucketName = process.env.S3_CACHE_BUCKET || 'video-gennie-cache';

            try {
                // Download the file
                const musicResponse = await axios({
                    url: audioUrl,
                    method: "GET",
                    responseType: "arraybuffer",
                });

                const audioBuffer = Buffer.from(musicResponse.data);

                // Create temporary file using tmp package for validation
                const tempFile = tmp.fileSync({ postfix: '.mp3', keep: false });
                let tempFilePath = tempFile.name;

                try {
                    fs.writeFileSync(tempFilePath, audioBuffer);

                    // Verify the audio file is valid before uploading
                    await new Promise<void>((resolve, reject) => {
                        ffmpeg.ffprobe(tempFilePath, (err, metadata) => {
                            if (err) {
                                console.error("Invalid audio file:", err);
                                reject(err);
                            } else {
                                console.log(
                                    "Valid audio file downloaded. Duration:",
                                    metadata.format.duration
                                );
                                resolve();
                            }
                        });
                    });

                    // Upload to S3
                    const s3Params = {
                        Bucket: bucketName,
                        Key: s3Key,
                        Body: audioBuffer,
                        ContentType: 'audio/mpeg'
                    };

                    const uploadResult = await s3.upload(s3Params).promise();
                    console.log("Background music uploaded to S3:", s3Key);

                    // Return the S3 URL (not presigned)
                    return uploadResult.Location;
                } finally {
                    // Cleanup temporary file - tmp package will handle this automatically
                    // but we can also explicitly clean up if needed
                    tempFile.removeCallback();
                }
            } catch (downloadError) {
                console.error("Error downloading/uploading audio file:", downloadError);
                return fetchGenericBackgroundMusic(generationId, userId);
            }
        } else {
            console.log("No music tracks found, trying alternative search");
            return fetchGenericBackgroundMusic(generationId, userId);
        }
    } catch (error) {
        console.error("Error fetching music from Jamendo:", error);
        return fetchGenericBackgroundMusic(generationId, userId);
    }
}

/**
 * Fetch generic background music if the primary search fails and upload to S3
 */
export async function fetchGenericBackgroundMusic(generationId: string, userId: string): Promise<string | null> {
    try {
        const response = await axios.get<JamendoResponse>("https://api.jamendo.com/v3.0/tracks/", {
            params: {
                client_id: JAMENDO_CLIENT_ID,
                format: "json",
                limit: 5,
                include: "musicinfo",
                tags: "instrumental background",
                audioformat: "mp32",
                boost: "popularity_total",
            },
        });

        if (
            response.data &&
            response.data.results &&
            response.data.results.length > 0
        ) {
            const selectedTrack = response.data.results[0];
            const audioUrl = selectedTrack.audio;

            if (!audioUrl) {
                console.error("Could not find audio URL in the Jamendo API response");
                return null;
            }

            // Generate unique filename for S3
            const musicFileName = `generic_music_${uuidv4()}.mp3`;
            const s3Key = `${userId}/${generationId}/background-music/${musicFileName}`;

            // Determine bucket name from environment or use fallback
            const bucketName = process.env.S3_CACHE_BUCKET || 'video-gennie-cache';

            console.log("Audio URL:", audioUrl);

            try {
                // Download the file
                const musicResponse = await axios({
                    url: audioUrl,
                    method: "GET",
                    responseType: "arraybuffer",
                });

                const audioBuffer = Buffer.from(musicResponse.data);

                // Create temporary file using tmp package for validation
                const tempFile = tmp.fileSync({ postfix: '.mp3', keep: false });
                let tempFilePath = tempFile.name;

                try {
                    fs.writeFileSync(tempFilePath, audioBuffer);

                    // Verify the audio file is valid before uploading
                    await new Promise<void>((resolve, reject) => {
                        ffmpeg.ffprobe(tempFilePath, (err, metadata) => {
                            if (err) {
                                console.error("Invalid audio file:", err);
                                reject(err);
                            } else {
                                console.log(
                                    "Valid generic audio file downloaded. Duration:",
                                    metadata.format.duration
                                );
                                resolve();
                            }
                        });
                    });

                    // Upload to S3
                    const s3Params = {
                        Bucket: bucketName,
                        Key: s3Key,
                        Body: audioBuffer,
                        ContentType: 'audio/mpeg'
                    };

                    const uploadResult = await s3.upload(s3Params).promise();
                    console.log("Generic background music uploaded to S3:", s3Key);

                    // Return the S3 URL (not presigned)
                    return uploadResult.Location;
                } finally {
                    // Cleanup temporary file - tmp package will handle this automatically
                    // but we can also explicitly clean up if needed
                    tempFile.removeCallback();
                }
            } catch (downloadError) {
                console.error("Error downloading/uploading generic audio file:", downloadError);
                return null;
            }
        } else {
            console.log("No music found at all, returning null");
            return null;
        }
    } catch (error) {
        console.error("Error fetching generic music from Jamendo:", error);
        return null;
    }
} 