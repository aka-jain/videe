# Docker Setup for Video Gennie

This document explains how to run Video Gennie using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose installed on your system
- API keys for the services used by Video Gennie (OpenAI, AWS, Pexels, etc.)

## Configuration

Before running the application, you need to set up your environment variables. You can do this in two ways:

### Option 1: Using a .env file

Create a `.env` file in the root directory with the following variables:

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

### Option 2: Modifying docker-compose.yml

Uncomment and fill in the environment variables in the `docker-compose.yml` file.

## Running the Application

### Build and start the container

```bash
docker-compose up -d
```

This will:

1. Build the Docker image if it doesn't exist
2. Create and start the container in detached mode

### View logs

```bash
docker-compose logs -f
```

### Stop the application

```bash
docker-compose down
```

## Docker Image Manual Build

If you prefer to build and run the Docker image manually:

```bash
# Build the image
docker build -t video-gennie .

# Run the container
docker run -p 3000:3000 \
  -v $(pwd)/output:/app/output \
  -v $(pwd)/cache:/app/cache \
  -v $(pwd)/storage:/app/storage \
  -v $(pwd)/logs:/app/logs \
  --env-file .env \
  video-gennie
```

## Volume Mounts

The Docker setup uses several volume mounts to persist data:

- `./output:/app/output`: For generated videos
- `./cache:/app/cache`: For cached data
- `./storage:/app/storage`: For storage system files
- `./logs:/app/logs`: For application logs

## Health Checks

The Docker container includes a health check that verifies the application is running properly. You can check the container's health status with:

```bash
docker ps
```

## Troubleshooting

### Permission Issues

If you encounter permission issues with the volume mounts, ensure the directories exist on your host machine and have the proper permissions:

```bash
mkdir -p output cache storage logs
chmod -R 777 output cache storage logs
```

### Container Not Starting

Check the logs for any startup errors:

```bash
docker-compose logs
```

### FFmpeg Issues

The container includes FFmpeg, which is required for the application. If you encounter FFmpeg-related errors, check if the installation is working properly:

```bash
docker exec -it video-gennie ffmpeg -version
```
