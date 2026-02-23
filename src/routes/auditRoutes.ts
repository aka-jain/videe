import express from 'express';
import { getSearchFailureStats } from '../utils/searchAuditLogger';

const router = express.Router();

/**
 * Get statistics about search failures
 */
router.get('/search-failures', (req, res) => {
    try {
        const stats = getSearchFailureStats();
        res.json({
            success: true,
            stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
});

export default router; 