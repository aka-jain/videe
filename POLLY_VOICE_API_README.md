# Polly Voice API Documentation

## Overview
AWS Polly Voice Management API for fetching, storing, and managing voice samples with neural engine support and S3 integration.

## Base URL
```
http://localhost:3001/api/polly-voices
```

## Authentication
No authentication required for these endpoints.

## Endpoints

### 1. Sync Voices
**POST** `/sync`

Fetches voices from AWS Polly across regions and stores them in DynamoDB. Only includes voices that support neural engine.

**Response:**
```json
{
  "success": true,
  "message": "Successfully synced X voices (neural engine only) with synthesis",
  "count": 18,
  "voices": [...]
}
```

### 2. Check and Add Voice
**POST** `/check-and-add`

Checks if a specific voice is available in a region and supports neural engine, then adds it to the collection.

**Body:**
```json
{
  "languageCode": "en-IN",
  "gender": "Female", 
  "region": "us-east-1"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Voice found and added successfully (neural engine supported) with synthesis",
  "voice": {...}
}
```

### 3. Synthesize Samples
**POST** `/synthesize-samples` not required as sync also does this

Generates voice samples for existing voices that don't have S3 objects.

**Response:**
```json
{
  "success": true,
  "message": "Synthesis completed: 5 successful, 0 failed",
  "total": 5,
  "successful": 5,
  "failed": 0
}
```

### 4. Get All Voices
**GET** `/`

Returns all voices with optional filters. Voice samples include presigned S3 URLs for direct playback.

**Query Parameters:**
- `languageCode` - Filter by language code (e.g., "en-US")
- `gender` - Filter by gender ("Male" or "Female")
- `region` - Filter by AWS region (e.g., "us-east-1")
- `isActive` - Filter by active status (true/false)

**Example:**
```
GET /?languageCode=en-US&gender=Female
```

### 5. Get Voice by ID
**GET** `/{id}`

Returns a specific voice by its ID with presigned S3 URL.

### 6. Update Voice
**PUT** `/{id}`

Updates voice properties.

**Body:**
```json
{
  "isActive": false
}
```

### 7. Delete Voice
**DELETE** `/{id}`

Deletes a specific voice from the collection.

### 8. Clear All Voices
**DELETE** `/clear`

Removes all voices from the collection.

### 9. Get Language Mapping
**GET** `/languages/mapping`

Returns language code mappings with available voice counts.

**Response:**
```json
{
  "success": true,
  "languages": [
    {
      "code": "en",
      "displayName": "English",
      "availableVoices": 4
    }
  ]
}
```

### 10. Get Voices by Language
**GET** `/languages/{languageCode}`

Returns all voices for a specific language with presigned S3 URLs.

**Example:**
```
GET /languages/en
```

## Voice Object Structure
```json
{
  "id": "uuid",
  "voiceId": "Matthew",
  "region": "us-east-1",
  "languageCode": "en-US",
  "gender": "Male",
  "sampleText": "Hello, this is a sample text for voice testing.",
  "voiceS3Object": "https://presigned-url-for-audio.mp3",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## Supported Languages
- English (en-US)
- Spanish (es-ES)
- French (fr-FR)
- German (de-DE)
- Italian (it-IT)
- Japanese (ja-JP)
- Portuguese (pt-BR)
- Chinese (cmn-CN)
- Hindi (en-IN)

## AWS Regions
- us-east-1
- us-west-2
- eu-west-1
- eu-central-1
- ap-southeast-1
- ap-northeast-1
- sa-east-1

## Features
- **Neural Engine Only**: Only voices supporting neural engine are included
- **Automatic Synthesis**: Voice samples are synthesized when adding voices
- **S3 Integration**: Voice samples stored in S3 with presigned URLs
- **Upsert Logic**: Prevents duplicate entries
- **Background Processing**: Parallel synthesis for better performance
- **Error Resilience**: Continues processing even if some operations fail

## Error Responses
```json
{
  "success": false,
  "error": "Error description"
}
```

## Testing with curl

```bash
# Sync voices
curl -X POST http://localhost:3001/api/polly-voices/sync

# Get all voices
curl -X GET http://localhost:3001/api/polly-voices

# Get voices by language
curl -X GET http://localhost:3001/api/polly-voices/languages/en

# Check and add specific voice
curl -X POST http://localhost:3001/api/polly-voices/check-and-add \
  -H "Content-Type: application/json" \
  -d '{"languageCode": "en-IN", "gender": "Female", "region": "us-east-1"}'
``` 