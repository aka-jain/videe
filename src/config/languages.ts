import { SynthesizeSpeechInput } from "aws-sdk/clients/polly";

export enum LocaleCode {
    EN_US = 'en-US',
    ES_ES = 'es-ES',
    FR_FR = 'fr-FR',
    DE_DE = 'de-DE',
    IT_IT = 'it-IT',
    JA_JP = 'ja-JP',
    PT_BR = 'pt-BR',
    ZH_CN = 'cmn-CN',
    HI_IN = 'en-IN',
}

export enum VoiceId {
    Matthew = 'Matthew',
    Sergio = 'Sergio',
    Mathieu = 'Mathieu',
    Daniel = 'Daniel',
    Giorgio = 'Giorgio',
    Takumi = 'Takumi',
    Ricardo = 'Ricardo',
    Zhiyu = 'Zhiyu',
    Aditi = 'Aditi',
}

/**
 * Language configuration interface for Amazon Polly
 */
export interface LanguageConfig {
    displayName: string;  // Human-readable language name
    subtitleFonts: string[]; // Primary and fallback fonts for subtitles
    fontEncoding: number; // ASS subtitle encoding value (1=UTF-8)
}

/**
 * Complete language configuration map with all supported languages
 */
export const LANGUAGE_CONFIG: Record<LocaleCode, LanguageConfig> = {
    [LocaleCode.EN_US]: {
        displayName: 'English',
        subtitleFonts: ['SparkyStonesRegular-BW6ld', 'Arial', 'Roboto'],
        fontEncoding: 1
    },
    [LocaleCode.ES_ES]: {
        displayName: 'Spanish',
        subtitleFonts: ['SparkyStonesRegular-BW6ld', 'Arial', 'Roboto'],
        fontEncoding: 1
    },
    [LocaleCode.FR_FR]: {
        displayName: 'French',
        subtitleFonts: ['Montserrat', 'Arial', 'Roboto'],
        fontEncoding: 1
    },
    [LocaleCode.DE_DE]: {
        displayName: 'German',
        subtitleFonts: ['Montserrat', 'Arial', 'Roboto'],
        fontEncoding: 1
    },
    [LocaleCode.IT_IT]: {
        displayName: 'Italian',
        subtitleFonts: ['Montserrat', 'Arial', 'Roboto'],
        fontEncoding: 1
    },
    [LocaleCode.JA_JP]: {
        displayName: 'Japanese',
        subtitleFonts: ['Noto Sans JP', 'Meiryo', 'MS Gothic', 'Arial Unicode MS'],
        fontEncoding: 1
    },
    [LocaleCode.PT_BR]: {
        displayName: 'Portuguese',
        subtitleFonts: ['Montserrat', 'Arial', 'Roboto'],
        fontEncoding: 1
    },
    [LocaleCode.ZH_CN]: {
        displayName: 'Chinese',
        subtitleFonts: ['Noto Sans SC', 'SimHei', 'Microsoft YaHei', 'Arial Unicode MS'],
        fontEncoding: 1
    },
    [LocaleCode.HI_IN]: {
        displayName: 'Hindi',
        subtitleFonts: ['Lohit-Devanagari', 'Mangal', 'Arial Unicode MS'],
        fontEncoding: 1
    }
};

/**
 * Helper function to get a typed array of all supported language codes
 */
export const getSupportedLanguageCodes = (): LocaleCode[] => {
    return Object.values(LocaleCode);
};

/**
 * Helper function to get a typed array of language display names
 */
export const getSupportedLanguageNames = (): string[] => {
    return Object.values(LANGUAGE_CONFIG).map(config => config.displayName);
};

/**
 * Get language configuration for a language code
 * @param languageCode The language code to get configuration for
 * @returns The language configuration or the English configuration if not found
 */
export const getLanguageConfig = (languageCode: string): LanguageConfig => {
    // Type guard: check if the provided code is a valid LanguageCode
    const isValidLanguage = (code: string): code is LocaleCode => {
        return Object.values(LocaleCode).includes(code as LocaleCode);
    };

    // Return the config if valid, otherwise return English as fallback
    return isValidLanguage(languageCode)
        ? LANGUAGE_CONFIG[languageCode]
        : LANGUAGE_CONFIG[LocaleCode.EN_US];
};

/**
 * Get Polly speech parameters for the given language
 * @param text The text to synthesize
 * @param localeCode The language code
 * @param voiceId The voice id
 * @param outputFormat The output format (default: mp3)
 * @returns Polly synthesize speech parameters
 */
export const getPollyVoiceParams = (
    text: string,
    localeCode: LocaleCode,
    voiceId: VoiceId,
    outputFormat: string = "mp3"
): SynthesizeSpeechInput => {

    return {
        Text: text,
        LanguageCode: localeCode,
        VoiceId: voiceId,
        Engine: "neural",
        OutputFormat: outputFormat
    };
};

/**
 * Validate if a language code is supported
 * @param languageCode The language code to validate
 * @returns true if the language is supported, false otherwise
 */
export const isLanguageSupported = (languageCode: string): boolean => {
    return Object.values(LocaleCode).includes(languageCode as LocaleCode);
}; 