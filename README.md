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
