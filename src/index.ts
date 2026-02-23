import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { initializeVideoRoutes } from "./routes/videoRoutes";
import { ensureDirectoriesExist } from "./utils";
import { initializeStorage } from "./storage/init";
import auditRoutes from "./routes/auditRoutes";
import pollyVoiceRoutes from "./routes/pollyVoiceRoutes";

// Configure environment variables
dotenv.config();


// Create app
const app = express();
app.use(express.json());

// Enable CORS with specific origin
app.use(cors({
    origin: [
        'http://localhost:3000',  // Next.js default port
        'https://www.videe.com',
        'https://videe.com',
        'http://localhost:5173',  // Current frontend port
        'http://127.0.0.1:3000',  // Alternative localhost format
        'http://127.0.0.1:5173'   // Alternative localhost format
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Accept',
        'Origin',
        'X-Requested-With',
        'sec-ch-ua',
        'sec-ch-ua-mobile',
        'sec-ch-ua-platform',
        'Referer',
        'User-Agent'
    ]
}));

// Basic health check endpoint - available immediately
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        message: 'Server is running'
    });
});

// Ensure required directories exist
ensureDirectoriesExist();

// Initialize storage system
initializeStorage()
    .then(async () => {
        // Register routes after storage is initialized
        app.use(await initializeVideoRoutes());

        // Register audit routes
        app.use('/api/audit', auditRoutes);

        // Register Polly voice routes
        app.use('/api/polly-voices', pollyVoiceRoutes);

        // Start the server
        const PORT = process.env.PORT || 3001;
        app.listen(PORT, () => {
            console.log(`Server started on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Failed to initialize storage system:', error);
        process.exit(1);
    }); 