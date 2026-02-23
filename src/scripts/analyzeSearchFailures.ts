import { getSearchFailureStats } from '../utils/searchAuditLogger';
import fs from 'fs';
import path from 'path';

// Define interface for failure logs
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

// Log directory path
const LOG_DIR = path.join(process.cwd(), 'logs');
const SEARCH_AUDIT_LOG = path.join(LOG_DIR, 'search_failures.json');

/**
 * Display search failure statistics in the console
 */
async function displaySearchFailureStats(): Promise<void> {
    try {
        // Check if log file exists
        if (!fs.existsSync(SEARCH_AUDIT_LOG)) {
            console.log('No search failure logs found.');
            return;
        }

        const stats = getSearchFailureStats();

        console.log('\n======= IMAGE SEARCH FAILURE AUDIT =======\n');

        console.log(`Total failed searches: ${stats.total}`);

        console.log('\n--- FAILURES BY SOURCE ---');
        Object.entries(stats.bySource).forEach(([source, count]) => {
            console.log(`${source}: ${count} (${((count / stats.total) * 100).toFixed(1)}%)`);
        });

        console.log('\n--- FAILURES BY SEARCH TYPE ---');
        Object.entries(stats.bySearchType).forEach(([type, count]) => {
            console.log(`${type}: ${count} (${((count / stats.total) * 100).toFixed(1)}%)`);
        });

        console.log('\n--- TOP FAILURE REASONS ---');
        const sortedReasons = Object.entries(stats.commonReasons)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        sortedReasons.forEach(([reason, count]) => {
            console.log(`- ${reason}: ${count} (${((count / stats.total) * 100).toFixed(1)}%)`);
        });

        console.log('\n--- RECENT FAILURES ---');
        stats.recentFailures.forEach((failure: SearchFailureLog, index: number) => {
            console.log(`${index + 1}. [${failure.source}] ${failure.query} - ${failure.reason} (${new Date(failure.timestamp).toLocaleString()})`);
        });

        console.log('\n=======================================\n');
    } catch (error) {
        console.error('Error analyzing search failures:', error);
    }
}

// Execute the function if this script is run directly
if (require.main === module) {
    displaySearchFailureStats();
}

export { displaySearchFailureStats }; 