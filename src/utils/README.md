# LLM Process Logging

This utility provides logging for Large Language Model (LLM) operations used in the video generation process. The logs capture both input and output data for debugging, analysis, and improvement purposes.

## Available Logs

The logs are stored in the `./logs` directory at the project root:

1. `keyword_extraction.log` - Contains logs of all LLM keyword extraction operations
2. `video_selection.log` - Contains logs of all LLM video selection decisions

## Log Format

Both logs use a JSON format with timestamp, inputs and outputs sections separated by `---` delimiters.

### Keyword Extraction Log Structure

```json
{
  "timestamp": "2023-05-15T14:23:45.123Z",
  "inputs": {
    "text": "The text segment being analyzed",
    "existingKeywords": ["existing", "keywords"],
    "fullContext": "Truncated script context...",
    "preventRepetition": true,
    "recentKeywords": ["recent", "keywords"]
  },
  "outputs": {
    "extractedKeywords": ["extracted", "keywords", "from", "llm"]
  }
}
---
```

### Video Selection Log Structure

```json
{
  "timestamp": "2023-05-15T14:25:12.456Z",
  "inputs": {
    "scriptSegment": "The text segment being visualized",
    "candidateCount": 5,
    "fullScriptContext": "Truncated script context...",
    "candidateVideos": [
      {
        "id": "video1_id",
        "title": "Video Title",
        "description": "Truncated description...",
        "tags": ["tag1", "tag2"],
        "duration": 10.5,
        "aspectRatio": 1.78
      },
      // More candidates...
    ]
  },
  "outputs": {
    "selectedVideo": {
      "id": "selected_video_id",
      "title": "Selected Video Title",
      "description": "Truncated description...",
      "tags": ["tag1", "tag2"],
      "duration": 10.5,
      "aspectRatio": 1.78
    }
  }
}
---
```

## Usage

Logs are automatically generated when the application processes text segments and selects videos. For analysis:

1. Check the log files in the `./logs` directory
2. Use tools like `jq` to analyze the JSON data patterns:
   ```bash
   cat logs/keyword_extraction.log | jq '.outputs.extractedKeywords'
   ```
3. Track performance patterns and improve prompts based on log analysis

## Log Maintenance

The log files will grow over time. Consider implementing a log rotation system for production use.
