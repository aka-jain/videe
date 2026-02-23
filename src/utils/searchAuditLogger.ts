import fs from 'fs';
import path from 'path';

interface SearchFailureLog {
    timestamp: string;
    query: string;
    source: 'Google' | 'Pexels' | 'Other';
    searchType: 'image' | 'video';
    reason: string;
    attemptNumber?: number;
    orientation?: string;
    targetAspectRatio?: number;
}

const LOG_DIR = path.join(process.cwd(), 'logs');
const SEARCH_AUDIT_LOG = path.join(LOG_DIR, 'search_failures.json');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Ensure log file exists
if (!fs.existsSync(SEARCH_AUDIT_LOG)) {
    fs.writeFileSync(SEARCH_AUDIT_LOG, JSON.stringify([], null, 2));
}

/**
 * Log a failed image/video search
 */
export function logSearchFailure(options: SearchFailureLog): void {
    try {
        // Read existing logs
        const existingLogs = JSON.parse(fs.readFileSync(SEARCH_AUDIT_LOG, 'utf8'));

        // Add new log entry
        existingLogs.push(options);

        // Write back to file
        fs.writeFileSync(SEARCH_AUDIT_LOG, JSON.stringify(existingLogs, null, 2));

        console.log(`Logged search failure for query "${options.query}" from ${options.source}`);
    } catch (error) {
        console.error('Failed to write to search audit log:', error);
    }
}

/**
 * Get statistics about search failures
 */
export function getSearchFailureStats() {
    try {
        const logs = JSON.parse(fs.readFileSync(SEARCH_AUDIT_LOG, 'utf8'));

        const stats = {
            total: logs.length,
            bySource: {} as Record<string, number>,
            bySearchType: {} as Record<string, number>,
            commonReasons: {} as Record<string, number>,
            recentFailures: logs.slice(-10)
        };

        // Compile statistics
        logs.forEach((log: SearchFailureLog) => {
            // Count by source
            stats.bySource[log.source] = (stats.bySource[log.source] || 0) + 1;

            // Count by search type
            stats.bySearchType[log.searchType] = (stats.bySearchType[log.searchType] || 0) + 1;

            // Count common reasons
            stats.commonReasons[log.reason] = (stats.commonReasons[log.reason] || 0) + 1;
        });

        return stats;
    } catch (error) {
        console.error('Failed to read search audit log:', error);
        return { total: 0, bySource: {}, bySearchType: {}, commonReasons: {}, recentFailures: [] };
    }
} 