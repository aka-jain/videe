# Video Gennie

Video Gennie is a service that generates videos from text prompts. It uses AI to create scripts, extract key phrases, generate voiceovers, find suitable background music, and assemble everything into a complete video.

## Features

- Script generation using OpenAI
- Text-to-speech conversion using Amazon Polly
- Video sequence creation using Pexels API or Google Search API
- Background music selection using Jamendo API
- Automated video assembly with FFmpeg
- Video upload to YouTube using OAuth 2.0

## Prerequisites

- Node.js (v14 or higher)
- FFmpeg installed on your system
- API keys for:
  - OpenAI
  - AWS (for Amazon Polly)
  - Pexels (for stock videos/photos)
  - Google Search API (alternative to Pexels)
  - Jamendo (for music)

## Installation

1. Clone the repository:

   ```
   git clone https://github.com/yourusername/video-gennie.git
   cd video-gennie
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:

   ```
   OPENAI_API_KEY=your_openai_api_key
   OPENAI_ORGANIZATION=your_openai_org_id
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_REGION=us-east-1
   PEXELS_API_KEY=your_pexels_api_key
   GOOGLE_API_KEY=your_google_api_key
   GOOGLE_SEARCH_ENGINE_ID=your_google_search_engine_id
   USE_GOOGLE_SEARCH=false
   JAMENDO_CLIENT_ID=your_jamendo_client_id
   PORT=3000
   ```

4. Build the TypeScript code:
   ```
   npm run build
   ```

## Usage

1. Start the server:

   ```
   npm start
   ```

2. Send a POST request to `/generate-video` with a JSON payload:

   ```json
   {
     "prompt": "Your video generation prompt here"
   }
   ```

3. Wait for the video to be generated - this may take a few minutes depending on the prompt complexity.

4. The server will return the generated video file when complete.

## Development

For development with auto-restart:

```
npm run dev
```

## How It Works

1. The system receives a text prompt from the user
2. It generates a script using OpenAI
3. The script is converted to speech using Amazon Polly
4. Key phrases are extracted from the script for video search
5. Relevant video clips are found and downloaded from either Pexels or Google Search API (configurable)
6. Background music is selected from Jamendo based on the mood of the script
7. Everything is assembled into a final video using FFmpeg

## Google Search API Setup

To use Google Search API instead of Pexels:

1. Create a Google Cloud Platform account and project
2. Enable the Custom Search API
3. Create an API key from the Credentials page
4. Go to the Programmable Search Engine portal and create a new search engine
5. Configure your search engine to search the entire web and focus on images
6. Copy your Search Engine ID and API Key to your .env file
7. Set `USE_GOOGLE_SEARCH=true` in your .env file

## YouTube Upload Setup

To enable the YouTube upload functionality:

1. Create a project in the [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the YouTube Data API v3
3. Create OAuth 2.0 credentials:
   - Go to APIs & Services > Credentials
   - Create OAuth client ID
   - Select "Web application" as the application type
   - Add authorized redirect URIs for your application
   - Note down the client ID and client secret
4. Configure proper scopes for your OAuth consent screen:
   - `https://www.googleapis.com/auth/youtube.upload`
   - `https://www.googleapis.com/auth/youtube`

### Uploading Videos to YouTube

The application provides two endpoints for YouTube uploads:

1. Upload a specific generation by ID:

   ```
   POST /generation/:generationId/youtube-upload
   {
     "oauthToken": "user_oauth_token",
     "title": "Video Title (optional)",
     "description": "Video Description (optional)",
     "tags": ["tag1", "tag2"], // or comma-separated string
     "privacyStatus": "private|unlisted|public" // default: private
   }
   ```

2. Upload any video file:
   ```
   POST /youtube-upload
   {
     "oauthToken": "user_oauth_token",
     "videoPath": "/path/to/video.mp4",
     "title": "Video Title (optional)",
     "description": "Video Description (optional)",
     "tags": ["tag1", "tag2"], // or comma-separated string
     "privacyStatus": "private|unlisted|public" // default: private
   }
   ```

For both endpoints, you need to obtain a valid OAuth 2.0 token with the appropriate YouTube scopes from the user.

## Resumability and Advanced Configuration

Video Gennie supports a step-by-step video generation process, allowing for resumability and fine-grained control over each stage. This is managed through a `generationId` which is returned when a new video generation is initialized.

### Generation ID

When you first initialize a video generation using `POST /generation/init` (or the `/generate-video` endpoint which handles this internally), a unique `generationId` is created and returned. This ID is crucial for interacting with the generation process at various stages. If a generation process is interrupted or if you wish to modify a specific step, you can use this `generationId` to resume or reconfigure the process.

### Checking Generation Status

You can check the current state and progress of a video generation at any time using its `generationId`.

**Endpoint:** `GET /generation/:generationId/status`

**Response:**
The endpoint returns a JSON object representing the `GenerationState`. This object contains all parameters, scripts, audio files, keyword data, clip information, and video outputs generated so far. Key fields include:
- `generationId`: The unique identifier for this generation task.
- `initialParams`: The parameters provided when the generation was initiated.
- `script`: Contains `content`, `mood`, and `source` (indicating if it was 'generated' or 'user' provided).
- `audio`: Details about the generated audio, including `audioUrl`, `speechMarks`, `scriptContentUsed`, and `scriptSource` (indicating if the audio was generated from the 'project_script' or a 'custom_for_audio' script).
- `keywords`: Information about extracted keywords, including `clipTimings` and `source` (indicating if timings were 'generated' or 'user' provided).
- `clips`: Details about processed video clips, including `processedClips`, `clipTimingsUsed`, and `timingsSource` (indicating if timings were from 'from_keywords_step' or 'custom_for_clips_step').
- `baseVideo`: Information about the video merged with audio but before subtitles.
- `finalVideo`: Information about the final subtitled video.
- `youtube`: Information related to YouTube upload if performed.

Each major step in the generation process updates the corresponding part of the `GenerationState`.

### Configuring Individual Generation Steps

You can customize each step of the video generation process by calling the specific endpoint for that step with your desired parameters. If a step is re-run, its output in the `GenerationState` is updated, and subsequent steps will use this new data.

**1. Script Generation**

Modify or provide a custom script for the video.

**Endpoint:** `POST /generation/:generationId/script`
**Request Body (optional):**
```json
{
  "userScript": "Your custom script content here. This will override any previously generated script."
}
```
**Example:**
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"userScript": "A new beginning for our story..."}' \
  http://localhost:3000/api/video/generation/your_generation_id/script
```
If `userScript` is provided, the `script.source` in `GenerationState` will be set to `'user'`.

**2. Audio Generation**

Generate audio using the project's current script or provide an edited version specifically for this audio generation step.

**Endpoint:** `POST /generation/:generationId/audio`
**Request Body (optional):**
```json
{
  "editedScript": "A slightly different version of the script, perhaps with specific intonations or pauses, just for audio generation."
}
```
**Example:**
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"editedScript": "Listen closely to this special announcement!"}' \
  http://localhost:3000/api/video/generation/your_generation_id/audio
```
If `editedScript` is provided, `audio.scriptContentUsed` will store this script, and `audio.scriptSource` will be `'custom_for_audio'`. Otherwise, the existing script from `GenerationState.script.content` is used, and `audio.scriptSource` will be `'project_script'`.

**3. Keyword Extraction**

Provide custom clip timings instead of using the automated keyword extraction.

**Endpoint:** `POST /generation/:generationId/keywords`
**Request Body (optional):**
```json
{
  "userClipTimings": [
    { "keyword": "sunset", "keywordType": "search", "startTime": 0, "duration": 5, "sentenceText": "A beautiful sunset over the mountains." },
    { "keyword": "city lights", "keywordType": "stock", "startTime": 5, "duration": 4, "sentenceText": "The city lights twinkled below." }
  ]
}
```
*   `ClipTiming` structure: `keyword` (string), `keywordType` ('search' or 'stock'), `startTime` (number, in seconds), `duration` (number, in seconds), `sentenceText` (string, the sentence this keyword belongs to).
**Example:**
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"userClipTimings": [{"keyword": "beach", "keywordType": "search", "startTime": 0, "duration": 3, "sentenceText": "Relaxing on the beach."}]}' \
  http://localhost:3000/api/video/generation/your_generation_id/keywords
```
If `userClipTimings` are provided, `keywords.clipTimings` will be updated with these values, and `keywords.source` will be `'user'`.

**4. Clip Processing**

Override the clip timings used for fetching and processing video clips. This allows you to change the keywords, their timings, or their search queries directly before clips are downloaded and processed.

**Endpoint:** `POST /generation/:generationId/clips`
**Request Body (optional):**
```json
{
  "overrideClipTimings": [
    { "keyword": "forest hike", "keywordType": "search", "startTime": 0, "duration": 6, "sentenceText": "A refreshing hike through the forest." },
    { "keyword": "campfire", "keywordType": "stock", "startTime": 6, "duration": 4, "sentenceText": "Gathering around the campfire." }
  ]
}
```
*   Uses the same `ClipTiming` structure as the keyword extraction step.
**Example:**
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"overrideClipTimings": [{"keyword": "winter snow", "keywordType": "search", "startTime": 0, "duration": 5, "sentenceText": "Snow falling in winter."}]}' \
  http://localhost:3000/api/video/generation/your_generation_id/clips
```
If `overrideClipTimings` are provided, `clips.clipTimingsUsed` will store these timings, and `clips.timingsSource` will be `'custom_for_clips_step'`. Otherwise, timings from `GenerationState.keywords.clipTimings` are used.

### Workflow

By using these endpoints, you can:
1. Initialize a generation: `POST /generation/init` (gets `generationId`).
2. Optionally, provide a custom script: `POST /generation/:generationId/script`.
3. Optionally, generate audio with a custom script variant: `POST /generation/:generationId/audio`.
4. Optionally, provide custom keyword timings: `POST /generation/:generationId/keywords`.
5. Optionally, provide override timings for clip processing: `POST /generation/:generationId/clips`.
6. Proceed with subsequent steps (e.g., concatenate, subtitles) which will use the latest state.

Each step builds upon the previous ones stored in `GenerationState`, allowing for iterative refinement and robust error recovery.

## License

[ISC License](https://opensource.org/licenses/ISC)
