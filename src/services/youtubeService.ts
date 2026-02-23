import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { OAuth2Client } from 'google-auth-library';

/**
 * Service for YouTube video uploads
 */
export class YouTubeService {
    private oauth2Client: OAuth2Client | null = null;

    /**
     * Initialize the OAuth2 client with user's token
     * @param token User's OAuth token
     */
    initialize(token: string): OAuth2Client {
        this.oauth2Client = new google.auth.OAuth2();
        this.oauth2Client.setCredentials({ access_token: token });
        return this.oauth2Client;
    }

    /**
     * Upload a video to YouTube
     * @param videoPath Path to the video file
     * @param title Video title
     * @param description Video description
     * @param tags Tags for the video
     * @param privacyStatus Privacy status (public, unlisted, private)
     */
    async uploadVideo(
        videoPath: string,
        title: string,
        description: string,
        tags: string[] = [],
        privacyStatus: 'public' | 'unlisted' | 'private' = 'private'
    ): Promise<{ id: string; url: string }> {
        if (!this.oauth2Client) {
            throw new Error('YouTube service not initialized with OAuth token');
        }

        if (!fs.existsSync(videoPath)) {
            throw new Error(`Video file not found at path: ${videoPath}`);
        }

        const youtube = google.youtube({
            version: 'v3',
            auth: this.oauth2Client
        });

        try {
            const fileSize = fs.statSync(videoPath).size;
            const res = await youtube.videos.insert({
                part: ['snippet', 'status'],
                requestBody: {
                    snippet: {
                        title,
                        description,
                        tags,
                        categoryId: '22', // People & Blogs category
                        defaultLanguage: 'en',
                        defaultAudioLanguage: 'en'
                    },
                    status: {
                        privacyStatus
                    }
                },
                media: {
                    body: fs.createReadStream(videoPath)
                }
            });

            if (!res.data.id) {
                throw new Error('Failed to upload video: No video ID returned');
            }

            return {
                id: res.data.id,
                url: `https://www.youtube.com/watch?v=${res.data.id}`
            };
        } catch (error) {
            console.error('Error uploading video to YouTube:', error);
            throw error;
        }
    }

    /**
     * Upload a custom thumbnail for a video
     * @param videoId ID of the video
     * @param thumbnailPath Path to the thumbnail image
     */
    async uploadThumbnail(videoId: string, thumbnailPath: string): Promise<void> {
        if (!this.oauth2Client) {
            throw new Error('YouTube service not initialized with OAuth token');
        }

        if (!fs.existsSync(thumbnailPath)) {
            throw new Error(`Thumbnail file not found at path: ${thumbnailPath}`);
        }

        const youtube = google.youtube({
            version: 'v3',
            auth: this.oauth2Client
        });

        try {
            await youtube.thumbnails.set({
                videoId,
                media: {
                    body: fs.createReadStream(thumbnailPath)
                }
            });
        } catch (error) {
            console.error('Error uploading thumbnail to YouTube:', error);
            throw error;
        }
    }
} 