export enum LocaleCode {
    EN_US = 'en-US',
    ES_ES = 'es-ES',
    FR_FR = 'fr-FR',
    DE_DE = 'de-DE',
    IT_IT = 'it-IT',
    JA_JP = 'ja-JP',
    PT_BR = 'pt-BR',
    ZH_CN = 'zh-CN',
    HI_IN = 'hi-IN'
}

/**
 * Language configuration is now sourced dynamically from the backend API.
 *
 * Languages are fetched from: GET /api/polly-voices/
 * This ensures that only languages with available voices are shown to users.
 *
 * The language configuration includes:
 * - displayName: Human-readable language name
 * - subtitleFonts: Fonts for subtitle rendering
 * - fontEncoding: Subtitle encoding settings
 *
 * Frontend components should use the useVoices() hook to get available languages.
 */

// This file is kept for documentation purposes.
// All language data is now retrieved from the backend API. 