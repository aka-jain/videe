import express from 'express';
import { PollyVoiceService } from '../services/pollyVoiceService';
import { PollyVoiceStorage } from '../storage/implementations/PollyVoiceStorage';
import { PollyVoice, VoiceSearchParams, VoiceListResponse, VoiceResponse, LanguageMappingResponse } from '../types/pollyVoice';
import { getLanguageConfig, isLanguageSupported, LANGUAGE_CONFIG, LocaleCode } from '../config/languages';
import authenticateUser from '../middleware/authMiddleware';

const router = express.Router();
const voiceStorage = new PollyVoiceStorage();
const voiceService = new PollyVoiceService();

const isIternalUser = (email: string) => {
    return ['justsudheerpaliwal@gmail.com', 'nikhilmaurya10@gmail.com', 'akashjain993@gmail.com'].includes(email);
}

// Initialize storage when the module loads
(async () => {
    try {
        await voiceStorage.initialize({
            tableName: process.env.POLLY_VOICES_TABLE || 'video-gennie-polly-voices',
            region: process.env.AWS_REGION
        });
        console.log('Polly voice storage initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Polly voice storage:', error);
    }
})();

/**
 * POST /api/polly-voices/sync
 * Sync voices from AWS Polly to DynamoDB (only neural engine supported voices) with synthesis
 */
router.post('/sync', authenticateUser, async (req, res) => {
    if (!isIternalUser(req.user?.email || '')) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized'
        });
    }

    try {
        console.log('Starting voice sync from AWS Polly (neural engine only) with synthesis...');

        // Fetch voices for supported languages (one male, one female per language)
        const voices = await voiceService.getVoicesForSupportedLanguages();

        if (voices.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No voices found for supported languages with neural engine support'
            });
        }

        console.log(`Found ${voices.length} voices with neural engine support`);

        // Process each voice with synthesis and upsert
        const processedVoices: PollyVoice[] = [];
        const synthesisPromises: Promise<void>[] = [];

        for (const voice of voices) {
            try {
                // Check if voice already exists
                const existingVoice = await voiceStorage.findByVoiceIdAndRegion(voice.voiceId, voice.region);

                if (existingVoice) {
                    console.log(`Voice ${voice.voiceId} already exists, skipping`);
                    processedVoices.push(existingVoice);
                    continue;
                }

                // Synthesize voice sample in background
                const synthesisPromise = voiceService.synthesizeVoiceSample(voice)
                    .then(s3Url => {
                        voice.voiceS3Object = s3Url;
                        return voiceStorage.upsert(voice);
                    })
                    .then(() => {
                        processedVoices.push(voice);
                        console.log(`Successfully processed voice: ${voice.voiceId} (${voice.languageCode})`);
                    })
                    .catch(error => {
                        console.error(`Error processing voice ${voice.voiceId}:`, error);
                        // Still save the voice without S3 object if synthesis fails
                        voice.voiceS3Object = '';
                        return voiceStorage.upsert(voice).then(() => {
                            processedVoices.push(voice);
                        });
                    });

                synthesisPromises.push(synthesisPromise);
            } catch (error) {
                console.error(`Error processing voice ${voice.voiceId}:`, error);
            }
        }

        // Wait for all synthesis to complete
        await Promise.all(synthesisPromises);

        console.log(`Successfully synced ${processedVoices.length} voices to DynamoDB`);

        res.json({
            success: true,
            message: `Successfully synced ${processedVoices.length} voices (neural engine only) with synthesis`,
            count: processedVoices.length,
            voices: processedVoices
        });
    } catch (error) {
        console.error('Error syncing voices:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
});

/**
 * POST /api/polly-voices/check-and-add
 * Check if a specific voice is available and supports neural engine, then add it to the collection with synthesis
 */
router.post('/check-and-add', authenticateUser, async (req, res) => {
    if (!isIternalUser(req.user?.email || '')) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized'
        });
    }
    try {
        const { languageCode, gender, region } = req.body;

        if (!languageCode || !gender || !region) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: languageCode, gender, region'
            });
        }

        if (!['Male', 'Female'].includes(gender)) {
            return res.status(400).json({
                success: false,
                error: 'Gender must be either "Male" or "Female"'
            });
        }

        console.log(`Checking voice availability: ${languageCode} (${gender}) in ${region}`);

        // Check if voice is available and supports neural engine
        const voice = await voiceService.checkVoiceAvailability(languageCode, gender as 'Male' | 'Female', region);

        if (!voice) {
            return res.status(404).json({
                success: false,
                error: `Voice not found or does not support neural engine: ${languageCode} (${gender}) in ${region}`
            });
        }

        // Check if voice already exists
        const existingVoice = await voiceStorage.findByVoiceIdAndRegion(voice.voiceId, voice.region);

        if (existingVoice) {
            return res.json({
                success: true,
                message: 'Voice already exists in collection',
                voice: existingVoice
            });
        }

        // Synthesize voice sample
        try {
            const s3Url = await voiceService.synthesizeVoiceSample(voice);
            voice.voiceS3Object = s3Url;
        } catch (synthesisError) {
            console.error(`Error synthesizing voice sample:`, synthesisError);
            voice.voiceS3Object = '';
        }

        // Save to DynamoDB
        await voiceStorage.upsert(voice);

        console.log(`Successfully added voice: ${voice.voiceId} (${voice.languageCode})`);

        res.json({
            success: true,
            message: 'Voice found and added successfully (neural engine supported) with synthesis',
            voice
        });
    } catch (error) {
        console.error('Error checking and adding voice:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
});

/**
 * DELETE /api/polly-voices/clear
 * Clear all voices from the collection
 */
router.delete('/clear', authenticateUser, async (req, res) => {
    if (!isIternalUser(req.user?.email || '')) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized'
        });
    }
    try {
        console.log('Clearing all voices from collection...');

        // Get all voices first
        const allVoices = await voiceStorage.getAll();
        console.log(`Found ${allVoices.length} voices to delete`);

        // Delete each voice
        for (const voice of allVoices) {
            await voiceStorage.delete(voice.id);
        }

        console.log(`Successfully deleted ${allVoices.length} voices`);

        res.json({
            success: true,
            message: `Successfully deleted ${allVoices.length} voices`,
            deletedCount: allVoices.length
        });
    } catch (error) {
        console.error('Error clearing voices:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
});

/**
 * GET /api/polly-voices
 * Get list of available voices with optional filters
 */
router.get('/', authenticateUser, async (req, res) => {
    try {
        const { languageCode, gender, region, isActive } = req.query;

        const searchParams: VoiceSearchParams = {};

        if (languageCode) searchParams.languageCode = languageCode as string;
        if (gender) searchParams.gender = gender as 'Male' | 'Female';
        if (region) searchParams.region = region as string;
        if (isActive !== undefined) searchParams.isActive = isActive === 'true';

        const voices = await voiceStorage.search(searchParams);

        // Add presigned URLs for voice samples
        const voicesWithPresignedUrls = voiceService.addPresignedUrls(voices);

        const response: VoiceListResponse = {
            success: true,
            voices: voicesWithPresignedUrls.filter(voice => voice.isActive && voice.region === 'us-east-1'),
            languages: LANGUAGE_CONFIG,
            total: voicesWithPresignedUrls.length
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching voices:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
});

/**
 * GET /api/polly-voices/:id
 * Get a specific voice by ID
 */
router.get('/:id', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const voice = await voiceStorage.get(id);

        if (!voice) {
            return res.status(404).json({
                success: false,
                error: 'Voice not found'
            });
        }

        // Add presigned URL for voice sample
        const voiceWithPresignedUrl = voiceService.addPresignedUrls([voice])[0];

        const response: VoiceResponse = {
            success: true,
            voice: voiceWithPresignedUrl
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching voice:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
});

/**
 * PUT /api/polly-voices/:id
 * Update a voice
 */
router.put('/:id', authenticateUser, async (req, res) => {
    if (!isIternalUser(req.user?.email || '')) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized'
        });
    }
    try {
        const { id } = req.params;
        const updates = req.body;

        // Remove fields that shouldn't be updated
        delete updates.id;
        delete updates.createdAt;

        await voiceStorage.update(id, updates);

        const voice = await voiceStorage.get(id);

        const response: VoiceResponse = {
            success: true,
            voice: voice || undefined
        };

        res.json(response);
    } catch (error) {
        console.error('Error updating voice:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
});

/**
 * DELETE /api/polly-voices/:id
 * Delete a voice
 */
router.delete('/:id', authenticateUser, async (req, res) => {
    if (!isIternalUser(req.user?.email || '')) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized'
        });
    }
    try {
        const { id } = req.params;
        await voiceStorage.delete(id);

        res.json({
            success: true,
            message: 'Voice deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting voice:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
});

/**
 * GET /api/polly-voices/languages/mapping
 * Get language code mapping with available voice counts
 */
router.get('/languages/mapping', authenticateUser, async (req, res) => {
    if (!isIternalUser(req.user?.email || '')) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized'
        });
    }
    try {
        const allVoices = await voiceStorage.getAll();

        const languageMapping = Object.values(LocaleCode).map(code => {
            const languageVoices = allVoices.filter(voice =>
                voice.languageCode === code && voice.isActive
            );
            const config = getLanguageConfig(code);

            return {
                code,
                displayName: config.displayName,
                availableVoices: languageVoices.length
            };
        });

        const response: LanguageMappingResponse = {
            success: true,
            languages: languageMapping
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching language mapping:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
});

/**
 * GET /api/polly-voices/languages/:languageCode
 * Get voices for a specific language code
 */
router.get('/languages/:languageCode', authenticateUser, async (req, res) => {
    try {
        const { languageCode } = req.params;

        if (!isLanguageSupported(languageCode)) {
            return res.status(400).json({
                success: false,
                error: 'Unsupported language code'
            });
        }

        const voices = await voiceStorage.search({
            languageCode: languageCode,
            isActive: true
        });

        // Add presigned URLs for voice samples
        const voicesWithPresignedUrls = voiceService.addPresignedUrls(voices);

        const response: VoiceListResponse = {
            success: true,
            voices: voicesWithPresignedUrls,
            languages: LANGUAGE_CONFIG,
            total: voicesWithPresignedUrls.length
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching voices for language:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
});

/**
 * POST /api/polly-voices/synthesize-samples
 * Synthesize voice samples for existing voices that don't have S3 objects
 */
router.post('/synthesize-samples', authenticateUser, async (req, res) => {
    if (!isIternalUser(req.user?.email || '')) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized'
        });
    }
    try {
        console.log('Starting voice sample synthesis for existing voices...');

        // Get all voices without S3 objects
        const voices = await voiceStorage.search({});
        const voicesWithoutSamples = voices.filter(voice => !voice.voiceS3Object || voice.voiceS3Object === '');

        if (voicesWithoutSamples.length === 0) {
            return res.json({
                success: true,
                message: 'All voices already have samples synthesized',
                count: 0
            });
        }

        console.log(`Found ${voicesWithoutSamples.length} voices without samples`);

        // Process synthesis in background
        const synthesisPromises = voicesWithoutSamples.map(async (voice) => {
            try {
                const s3Url = await voiceService.synthesizeVoiceSample(voice);
                voice.voiceS3Object = s3Url;
                await voiceStorage.upsert(voice);
                console.log(`Synthesized sample for voice: ${voice.voiceId}`);
                return { success: true, voiceId: voice.voiceId };
            } catch (error) {
                console.error(`Failed to synthesize sample for voice ${voice.voiceId}:`, error);
                return { success: false, voiceId: voice.voiceId, error: error instanceof Error ? error.message : String(error) };
            }
        });

        const results = await Promise.all(synthesisPromises);
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        res.json({
            success: true,
            message: `Synthesis completed: ${successful} successful, ${failed} failed`,
            total: voicesWithoutSamples.length,
            successful,
            failed,
            results
        });
    } catch (error) {
        console.error('Error synthesizing voice samples:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
});

export default router; 