import dotenv from "dotenv";
import { OpenAI } from "openai";
import AWS from "aws-sdk";

// Configure environment variables
dotenv.config();

// OpenAI Configuration
export const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORGANIZATION,
});

// AWS Configuration
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_POLLY_REGION,
});
console.log("AWS_POLLY_REGION", process.env.AWS_POLLY_REGION);

export const polly = new AWS.Polly();

// API Keys
export const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
export const JAMENDO_CLIENT_ID = process.env.JAMENDO_CLIENT_ID;
export const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
export const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;

// File paths
export const TEMP_DIR = "./temp";
export const OUTPUT_DIR = "./output";

// Ensure directories exist
import fs from "fs";
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

export const modelsToUse = {
    generateKeyWords: 'gpt-4.1-mini',
    generateKeyWordsInOneShot: 'o4-mini',
    scriptFactCheck: 'gpt-4.1-mini',
    scriptGenerateStage2: 'gpt-4.1',
    scriptGenerateSingleStage: 'gpt-4o-mini',
    determineMood: 'gpt-4o-mini',
    selectVideoWithLLm: 'gpt-4o-mini'
}