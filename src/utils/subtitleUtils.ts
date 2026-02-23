import fs from "fs";
import path from "path";
import tmp from "tmp";
import ffmpeg from "fluent-ffmpeg";
import { calculateSubtitleStyling } from "./ffmpegUtils";
import { executeFFmpegAsync } from "./ffmpegPromises";
import { getSubtitleFontConfig } from "../config/fonts";
import { LocaleCode } from "../config/languages";
/**
 * Parse SRT/ASS subtitle file to extract text and timing information for drawtext filter
 */
function parseSubtitleFile(
    subtitleFile: string
): Array<{ text: string, startTime: number, endTime: number }> {
    const content = fs.readFileSync(subtitleFile, 'utf8');
    const subtitles: Array<{ text: string, startTime: number, endTime: number }> = [];

    // Simple SRT parsing
    const blocks = content.split(/\r?\n\r?\n/).filter(block => block.trim());

    for (const block of blocks) {
        const lines = block.split(/\r?\n/);
        if (lines.length >= 3) {
            // Parse timing line
            const timingMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
            if (timingMatch) {
                const startTimeStr = timingMatch[1].replace(',', '.');
                const endTimeStr = timingMatch[2].replace(',', '.');

                // Convert to seconds
                const startTime = timeToSeconds(startTimeStr);
                const endTime = timeToSeconds(endTimeStr);

                // Get subtitle text (could be multiple lines)
                const text = lines.slice(2).join(' ').replace(/\r?\n/g, ' ');
                // escape text so that there is ' is escaped as '\''
                const escapedText = text.replaceAll("'", "");
                subtitles.push({ text: escapedText, startTime, endTime });
            }
        }
    }

    return subtitles;
}

/**
 * Helper function to convert SRT time format to seconds
 */
function timeToSeconds(timeStr: string): number {
    const parts = timeStr.split(':');
    const secParts = parts[2].split('.');

    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(secParts[0], 10);
    const milliseconds = secParts.length > 1 ? parseInt(secParts[1], 10) : 0;

    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

/**
 * Get a visually pleasing color from the palette
 * @param index Index to get color for
 * @returns Hex color code
 */
function getColorFromPalette(index: number): string {
    // Visually pleasing pastel and bright colors that work well on dark backgrounds
    const colors = [
        '#FFE66D', // Pastel Yellow
        '#FF6B6B', // Coral Red
        '#4ECDC4', // Turquoise
        '#95E1D3', // Mint
        '#A8E6CF', // Light Green
        '#FFB6B9', // Light Pink
        '#8860D0', // Purple
        '#F8B195', // Peach
        '#C06C84', // Rose
        '#87CEEB'  // Sky Blue
    ];
    return colors[index % colors.length];
}

/** ffmpeg’s drawtext needs \', \:, \, and \\ literals escaped. */
function escapeForDrawtext(text: string): string {
    return text
        .replace(/\\/g, "\\\\")   // MUST happen first → “\” → “\\”
        .replace(/'/g, "\\'")    //   '  →  \'
        .replace(/:/g, "\\:")    //   :  →  \:
        .replace(/,/g, "\\,");   //   ,  →  \,
}

/** Robust way to pick the actual font file that exists on disk. */
function fontPath({ fontName, fontDir }: { fontName: string; fontDir: string }): string {
    const withExt = /\.[ot]tf$/i.test(fontName) ? fontName : `${fontName}.ttf`;
    return path.join(fontDir, withExt);
}

/** Pick a temporary filename and keep it around until process exit. */
function tempFilterFile(contents: string): string {
    const f = tmp.fileSync({ postfix: ".ffilters" });
    fs.writeFileSync(f.name, contents, "utf8");
    return f.name;
}

/** Optional overrides derived from user memory preferences (e.g. caption styling) */
export interface CaptionStyleOverrides {
    fontSizeMultiplier?: number;
    yPositionPercent?: number; // 0-1, e.g. 0.3 = 30% from top
}

/** Derive caption style overrides from memory text (e.g. "large font", "subtitles at bottom"). */
export function deriveCaptionStyleFromMemories(memories: string[]): CaptionStyleOverrides {
    const text = (memories || []).filter(Boolean).join(" ").toLowerCase();
    if (!text) return {};

    let fontSizeMultiplier = 1;
    let yPositionPercent: number | undefined;

    if (/\b(large|bigger?|huge)\s*(font|subtitle|text|caption)s?\b|\bbig\s+font\b/.test(text)) {
        fontSizeMultiplier = 1.25;
    } else if (/\b(small(er)?|tiny)\s*(font|subtitle|text|caption)s?\b/.test(text)) {
        fontSizeMultiplier = 0.85;
    }

    if (/\bsubtitle(s)?\s*(at|on)\s*top\b|\bcaption(s)?\s*at\s*top\b|\btop\s*(of\s*screen)?\b/.test(text)) {
        yPositionPercent = 0.15;
    } else if (/\bsubtitle(s)?\s*(at|on)\s*bottom\b|\bcaption(s)?\s*at\s*bottom\b|\bbottom\s*(of\s*screen)?\b/.test(text)) {
        yPositionPercent = 0.85;
    } else if (/\bcenter(ed)?\s*(subtitle|caption)\b/.test(text)) {
        yPositionPercent = 0.3;
    }

    const out: CaptionStyleOverrides = {};
    if (fontSizeMultiplier !== 1) out.fontSizeMultiplier = fontSizeMultiplier;
    if (yPositionPercent !== undefined) out.yPositionPercent = yPositionPercent;
    return out;
}

/* ------------------------------------------------------------------ */
/* 1. createFancyDrawtextFilter                                       */
/* ------------------------------------------------------------------ */

function createFancyDrawtextFilter(
    subtitles: Array<{ text: string; startTime: number; endTime: number }>,
    fontConfig: { fontName: string; fontDir: string },
    aspectRatio: string,
    styleOverrides?: CaptionStyleOverrides
): string {

    const { fontSize } = calculateSubtitleStyling(aspectRatio);
    const mult = styleOverrides?.fontSizeMultiplier ?? 1;
    const fancyFontSize = Math.round(fontSize * 5.4 * mult);                        // × 6.4 as before
    const yPercent = styleOverrides?.yPositionPercent ?? 0.3;
    const yPos = `(h*${yPercent})`;                             // 30 % from top

    const filters = subtitles.map((s, i) => {
        const txt = escapeForDrawtext(s.text);
        const color = getColorFromPalette(i);
        return [
            `drawtext=fontfile='${fontPath(fontConfig)}'`,
            `text='${txt}'`,
            `fontsize=${fancyFontSize}`,
            `fontcolor=${color}`,
            `borderw=6:bordercolor=black@0.9`,
            `shadowx=4:shadowy=4`,
            `x=(w-tw)/2:y=${yPos}`,
            `alpha='if(lt(t,${s.startTime}),0,if(gt(t,${s.endTime}),0,1))'`,
            `enable='between(t,${s.startTime},${s.endTime})'`,
        ].join(":");
    });

    return filters.join(",");
}

/* ------------------------------------------------------------------ */
/* 2. addCaptionsToVideo                                              */
/* ------------------------------------------------------------------ */

export async function addCaptionsToVideo(
    inputVideo: string,
    captionsFile: string,
    outputPath: string,
    aspectRatio: string,
    language: LocaleCode,
    captionMemories?: string[]
): Promise<string> {

    console.log(`Adding ${language} captions → ${outputPath}`);

    if (!fs.existsSync(inputVideo)) throw new Error(`Missing input: ${inputVideo}`);
    if (!fs.existsSync(captionsFile)) throw new Error(`Missing captions: ${captionsFile}`);

    const fontConfig = getSubtitleFontConfig(language);
    const subtitles = parseSubtitleFile(captionsFile);
    if (subtitles.length === 0) throw new Error(`No subtitles in ${captionsFile}`);

    const styleOverrides = captionMemories?.length ? deriveCaptionStyleFromMemories(captionMemories) : undefined;
    if (styleOverrides && Object.keys(styleOverrides).length > 0) {
        console.log("Applying caption style overrides from memories:", styleOverrides);
    }

    // ------------------------------------------------------------------
    // Build the drawtext chain and decide if we must use a filter script
    // ------------------------------------------------------------------
    const filterGraph = createFancyDrawtextFilter(subtitles, fontConfig, aspectRatio, styleOverrides);
    const argLimit = 32_000;                      // safe under macOS ARG_MAX
    const useScriptFile = filterGraph.length > argLimit;
    const ffmpegCmd = ffmpeg().input(inputVideo);

    if (useScriptFile) {
        const scriptPath = tempFilterFile(filterGraph);
        console.log(`Filter graph is ${filterGraph.length} chars → using -filter_complex_script`);
        ffmpegCmd.inputOptions(["-filter_complex_script", scriptPath]);
    } else {
        ffmpegCmd.outputOptions(["-vf", filterGraph]);
    }

    ffmpegCmd
        .videoCodec("libx264")
        .audioCodec("copy")
        .outputOptions(["-shortest"])
        .output(outputPath);

    return executeFFmpegAsync(ffmpegCmd, outputPath, "Caption burning");
}