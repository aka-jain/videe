import { useState, useEffect } from 'react';
import { fetchPollyVoices, VoiceListResponse, LanguageConfig, PollyVoice } from '../lib/videoGenieApi';

interface UseVoicesReturn {
    languages: Record<string, LanguageConfig>;
    voices: PollyVoice[];
    availableLanguageCodes: string[];
    loading: boolean;
    error: string | null;
    getVoicesByLanguage: (languageCode: string) => PollyVoice[];
    getVoiceById: (voiceId: string) => PollyVoice | undefined;
}

interface CachedVoicesData {
    data: VoiceListResponse;
    timestamp: number;
}

const VOICES_CACHE_KEY = 'available_voices_cache';
const CACHE_EXPIRY_DAYS = 3;
const CACHE_EXPIRY_MS = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000; // 3 days in milliseconds

const getCachedVoicesData = (): VoiceListResponse | null => {
    try {
        const cached = localStorage.getItem(VOICES_CACHE_KEY);
        if (!cached) return null;

        const parsedCache: CachedVoicesData = JSON.parse(cached);
        const now = Date.now();

        // Check if cache has expired
        if (now - parsedCache.timestamp > CACHE_EXPIRY_MS) {
            localStorage.removeItem(VOICES_CACHE_KEY);
            return null;
        }

        return parsedCache.data;
    } catch (error) {
        console.error('Error reading voices cache:', error);
        localStorage.removeItem(VOICES_CACHE_KEY);
        return null;
    }
};

const setCachedVoicesData = (data: VoiceListResponse): void => {
    try {
        const cacheData: CachedVoicesData = {
            data,
            timestamp: Date.now()
        };
        localStorage.setItem(VOICES_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
        console.error('Error saving voices cache:', error);
    }
};

export const useVoices = (): UseVoicesReturn => {
    const [data, setData] = useState<VoiceListResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                // First, try to get data from localStorage
                const cachedData = getCachedVoicesData();

                if (cachedData && isMounted) {
                    console.log('Using cached voices data');
                    setData(cachedData);
                    setLoading(false);
                    return;
                }

                // If no valid cached data, fetch from API
                console.log('Fetching fresh voices data');
                const response = await fetchPollyVoices();

                if (isMounted) {
                    setData(response);
                    // Cache the fresh data
                    setCachedVoicesData(response);
                }
            } catch (err) {
                if (isMounted) {
                    setError(err instanceof Error ? err.message : 'Failed to fetch voices');
                    console.error('Error fetching polly voices:', err);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            isMounted = false;
        };
    }, []);

    const languages = data?.languages || {};
    const voices = data?.voices || [];
    const availableLanguageCodes = Object.keys(languages);

    const getVoicesByLanguage = (languageCode: string): PollyVoice[] => {
        return voices.filter(voice => voice.languageCode === languageCode);
    };

    const getVoiceById = (voiceId: string): PollyVoice | undefined => {
        return voices.find(voice => voice.voiceId === voiceId);
    };

    return {
        languages,
        voices,
        availableLanguageCodes,
        loading,
        error,
        getVoicesByLanguage,
        getVoiceById
    };
}; 