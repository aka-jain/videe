import { Polly } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { PollyVoice } from '../types/pollyVoice';
import { LocaleCode } from '../config/languages';
import AWS from 'aws-sdk';

// Initialize S3 client
const s3 = new AWS.S3();

export class PollyVoiceService {
    private regions = [
        'us-east-1', 'us-west-2', 'eu-west-1', 'eu-central-1',
        'ap-southeast-1', 'ap-northeast-1', 'sa-east-1'
    ];

    /**
     * Generate presigned URL for S3 object, expire in 7 days
     */
    generatePresignedUrl(s3Url: string, expiresInSeconds: number = 7 * 24 * 60 * 60): string {
        try {
            // Parse the S3 URL to extract bucket and key
            const url = new URL(s3Url);
            let bucket: string;
            let key: string;

            // Handle different S3 URL formats
            if (url.hostname.includes('.s3.')) {
                // Format: https://bucket.s3.region.amazonaws.com/key
                bucket = url.hostname.split('.')[0];
                key = decodeURIComponent(url.pathname.substring(1)); // Decode URL-encoded characters and remove leading slash
            } else if (url.hostname.startsWith('s3.')) {
                // Format: https://s3.region.amazonaws.com/bucket/key
                const pathParts = url.pathname.substring(1).split('/');
                bucket = pathParts[0];
                key = decodeURIComponent(pathParts.slice(1).join('/')); // Decode URL-encoded characters
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
            return s3Url; // Return original URL if presigned URL generation fails
        }
    }

    /**
     * Add presigned URLs to voices
     */
    addPresignedUrls(voices: PollyVoice[]): PollyVoice[] {
        return voices.map(voice => ({
            ...voice,
            voiceS3Object: voice.voiceS3Object ? this.generatePresignedUrl(voice.voiceS3Object) : voice.voiceS3Object
        }));
    }

    /**
     * Synthesize voice sample and upload to S3
     */
    async synthesizeVoiceSample(voice: PollyVoice): Promise<string> {
        try {
            const polly = new Polly({ region: voice.region });

            const params = {
                Text: voice.sampleText,
                LanguageCode: voice.languageCode,
                VoiceId: voice.voiceId,
                Engine: 'neural',
                OutputFormat: 'mp3'
            };

            const result = await polly.synthesizeSpeech(params).promise();

            if (!result.AudioStream) {
                throw new Error(`No audio stream received from Polly for voice ${voice.voiceId}`);
            }

            // Generate S3 key
            const fileName = `voice-samples/${voice.languageCode}/${voice.voiceId}_${voice.gender.toLowerCase()}.mp3`;
            const bucketName = process.env.S3_PREVIEWS_BUCKET || 'video-gennie-previews';

            // Upload to S3
            const s3Params = {
                Bucket: bucketName,
                Key: fileName,
                Body: result.AudioStream,
                ContentType: 'audio/mpeg',
                Metadata: {
                    'voice-id': voice.voiceId,
                    'language-code': voice.languageCode,
                    'gender': voice.gender,
                    'region': voice.region,
                    'engine': 'neural'
                }
            };

            const uploadResult = await s3.upload(s3Params).promise();
            console.log(`Voice sample uploaded to S3: ${uploadResult.Location}`);

            return uploadResult.Location;
        } catch (error) {
            console.error(`Error synthesizing voice sample for ${voice.voiceId}:`, error);
            throw error;
        }
    }

    /**
     * Check if a voice supports neural engine
     */
    async checkNeuralSupport(voiceId: string, region: string): Promise<boolean> {
        try {
            const polly = new Polly({ region });
            const voices = await polly.describeVoices().promise();

            if (!voices.Voices) {
                return false;
            }

            const voice = voices.Voices.find(v => v.Id === voiceId);
            if (!voice) {
                return false;
            }

            // Check if the voice supports neural engine
            return !!(voice.SupportedEngines && voice.SupportedEngines.includes('neural'));
        } catch (error) {
            console.error(`Error checking neural support for voice ${voiceId}:`, error);
            return false;
        }
    }

    /**
     * Get one male and one female voice for each supported language using rolling method
     * Goes to next region only if required voices are not found in current region
     */
    async getVoicesForSupportedLanguages(): Promise<PollyVoice[]> {
        const selectedVoices: PollyVoice[] = [];
        const now = new Date().toISOString();

        // Track which languages still need voices
        const languageNeeds: Record<string, { male: boolean; female: boolean }> = {};

        // Initialize needs for all supported languages
        for (const languageCode of Object.values(LocaleCode)) {
            languageNeeds[languageCode] = { male: true, female: true };
        }

        // Check each region sequentially
        for (const region of this.regions) {
            try {
                const polly = new Polly({ region });
                const voices = await polly.describeVoices().promise();

                if (!voices.Voices) {
                    continue;
                }

                // Process voices from this region
                for (const voice of voices.Voices) {
                    if (!voice.Id || !voice.LanguageCode || !voice.Gender) {
                        continue;
                    }

                    const languageCode = voice.LanguageCode;
                    const gender = voice.Gender as 'Male' | 'Female';
                    const needs = languageNeeds[languageCode];

                    // Skip if we don't need this language or gender
                    if (!needs || !needs[gender.toLowerCase() as 'male' | 'female']) {
                        continue;
                    }

                    // Check if voice supports neural engine
                    const supportsNeural = voice.SupportedEngines && voice.SupportedEngines.includes('neural');
                    if (!supportsNeural) {
                        console.log(`Skipping voice ${voice.Id} - does not support neural engine`);
                        continue;
                    }

                    // Create voice record
                    const voiceData: PollyVoice = {
                        id: uuidv4(),
                        voiceId: voice.Id!,
                        region,
                        languageCode,
                        gender,
                        sampleText: this.getSampleText(languageCode),
                        voiceS3Object: '', // Will be populated after synthesis
                        isActive: true,
                        createdAt: now,
                        updatedAt: now
                    };

                    selectedVoices.push(voiceData);

                    // Mark this gender as found for this language
                    // needs[gender.toLowerCase() as 'male' | 'female'] = false;
                }

                // Check if we have all required voices
                const allVoicesFound = Object.values(languageNeeds).every(
                    needs => !needs.male && !needs.female
                );

                if (allVoicesFound) {
                    break;
                }

            } catch (error) {
                console.warn(`Failed to fetch voices from region ${region}:`, error);
                continue; // Move to next region
            }
        }

        return selectedVoices;
    }

    /**
     * Check if a specific voice is available in a region and supports neural engine
     */
    async checkVoiceAvailability(languageCode: string, gender: 'Male' | 'Female', region: string): Promise<PollyVoice | null> {
        try {
            const polly = new Polly({ region });
            const voices = await polly.describeVoices().promise();

            if (!voices.Voices) {
                return null;
            }

            // Find the first voice that matches the language, gender, and supports the neural engine
            const neuralVoice = voices.Voices.find(v =>
                v.LanguageCode === languageCode &&
                v.Gender === gender &&
                v.SupportedEngines && v.SupportedEngines.includes('neural')
            );

            if (!neuralVoice) {
                console.log(`No voices found that support neural engine for ${languageCode} (${gender})`);
                return null;
            }

            // Create voice record
            const voiceData: PollyVoice = {
                id: uuidv4(),
                voiceId: neuralVoice.Id!,
                region,
                languageCode,
                gender,
                sampleText: this.getSampleText(languageCode),
                voiceS3Object: '', // Will be populated after synthesis
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            return voiceData;
        } catch (error) {
            console.error(`Error checking voice availability:`, error);
            return null;
        }
    }

    /**
     * Fetch available voices from AWS Polly across all regions (legacy method)
     * This method is kept for backward compatibility but the rolling method is preferred
     */
    async fetchAvailableVoices(): Promise<PollyVoice[]> {
        const allVoices: PollyVoice[] = [];
        const now = new Date().toISOString();

        for (const region of this.regions) {
            try {
                const polly = new Polly({ region });
                const voices = await polly.describeVoices().promise();

                if (voices.Voices) {
                    for (const voice of voices.Voices) {
                        if (voice.Id && voice.LanguageCode && voice.Gender) {
                            // Check if voice supports neural engine
                            const supportsNeural = voice.SupportedEngines && voice.SupportedEngines.includes('neural');
                            if (!supportsNeural) {
                                console.log(`Skipping voice ${voice.Id} - does not support neural engine`);
                                continue;
                            }

                            const voiceData: PollyVoice = {
                                id: uuidv4(),
                                voiceId: voice.Id,
                                region,
                                languageCode: voice.LanguageCode,
                                gender: voice.Gender as 'Male' | 'Female',
                                sampleText: this.getSampleText(voice.LanguageCode),
                                voiceS3Object: '', // Will be populated later when generating voices
                                isActive: true,
                                createdAt: now,
                                updatedAt: now
                            };
                            allVoices.push(voiceData);
                        }
                    }
                }
            } catch (error) {
                console.warn(`Failed to fetch voices from region ${region}:`, error);
            }
        }

        return allVoices;
    }

    /**
     * Get sample text for a language
     */
    private getSampleText(languageCode: string): string {
        const sampleTexts: Record<string, string> = {
            'en-US': 'Hello, this is a sample text for voice testing.',
            'es-ES': 'Hola, este es un texto de ejemplo para probar la voz.',
            'fr-FR': 'Bonjour, ceci est un texte d\'exemple pour tester la voix.',
            'de-DE': 'Hallo, dies ist ein Beispieltext zum Testen der Stimme.',
            'it-IT': 'Ciao, questo è un testo di esempio per testare la voce.',
            'ja-JP': 'こんにちは、これは音声テスト用のサンプルテキストです。',
            'pt-BR': 'Olá, este é um texto de exemplo para testar a voz.',
            'cmn-CN': '你好，这是用于语音测试的示例文本。',
            'en-IN': 'नमस्ते, यह आवाज़ परीक्षण के लिए एक नमूना पाठ है।'
        };

        return sampleTexts[languageCode] || 'Hello, this is a sample text for voice testing.';
    }

    /**
     * Validate voice data
     */
    validateVoice(voice: Partial<PollyVoice>): boolean {
        return !!(
            voice.voiceId &&
            voice.region &&
            voice.languageCode &&
            voice.gender &&
            voice.sampleText
        );
    }
} 