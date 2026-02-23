import fs from 'fs';
import path from 'path';
import { getLanguageConfig, LocaleCode } from './languages';

/**
 * Font paths for different operating systems
 */
export const FONT_PATHS: Record<string, string[]> = {
    linux: ['/usr/local/share/fonts'],
    darwin: [`${process.env.HOME}/Library/Fonts`],
    win32: ['C:\\Windows\\Fonts']
};

/**
 * Get system font paths based on current platform
 */
export function getSystemFontPaths(): string[] {
    const platform = process.platform as keyof typeof FONT_PATHS;
    return FONT_PATHS[platform] || [];
}

/**
 * Get a string of font directories for ffmpeg
 * This is used to ensure that ffmpeg can find system fonts for subtitle rendering
 */
export function getFontDirsForFfmpeg(): string {
    const fontDirs = getSystemFontPaths();

    // Join paths with the appropriate separator based on platform
    if (process.platform === 'win32') {
        return fontDirs.join(';'); // Windows uses semicolon
    } else {
        return fontDirs.join('\\\\:'); // Unix systems use colon
    }
}

/**
 * Check if a font likely supports a given language
 * This is a basic check that looks for font files that might support the language
 */
export function findSupportingFonts(language: string): string[] {
    const langConfig = getLanguageConfig(language);
    const fontDirs = getSystemFontPaths();
    const availableFonts: string[] = [];

    // Look for the configured fonts in the system directories
    for (const fontDir of fontDirs) {
        if (!fs.existsSync(fontDir)) continue;

        try {
            const files = fs.readdirSync(fontDir);

            for (const font of langConfig.subtitleFonts) {
                // Look for files that might match the font name (case insensitive)
                const fontRegex = new RegExp(font.replace(/\s+/g, '.*'), 'i');
                const matchingFiles = files.filter(file => fontRegex.test(file));

                if (matchingFiles.length > 0) {
                    availableFonts.push(font);
                    // Add the full path for the first matching font
                    break;
                }
            }
        } catch (err) {
            console.warn(`Could not read font directory: ${fontDir}`, err);
        }
    }

    // Always include the default fallbacks
    if (availableFonts.length === 0) {
        availableFonts.push('Arial Unicode MS', 'Arial', 'Sans-serif');
    }

    return availableFonts;
}

/**
 * Get font configuration for subtitle rendering based on language
 */
export function getSubtitleFontConfig(language: LocaleCode): {
    fontName: string;
    encoding: number;
    fontDir: string;
} {
    const langConfig = getLanguageConfig(language);
    const fonts = findSupportingFonts(language);

    return {
        // Use the first available font or the first configured font as fallback
        fontName: fonts[0] || langConfig.subtitleFonts[0],
        encoding: langConfig.fontEncoding,
        fontDir: getFontDirsForFfmpeg()
    };
} 