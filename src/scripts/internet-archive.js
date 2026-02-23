/**
 * Internet Archive MP4 Clip Downloader
 *
 * This script downloads short MP4 clips (under 5MB) from Internet Archive
 * based on specified search queries for notable people and events.
 */

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const https = require("https");
const { execSync } = require("child_process");
const readline = require("readline");

// Create output directory if it doesn't exist
const OUTPUT_DIR = path.join(__dirname, "downloaded_clips");
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// List of specific people and events to search for
const searchQueries = [
  "Moon Landing Neil Armstrong clip",
  "Martin Luther King I Have A Dream clip",
  "Amelia Earhart interview clip",
  "Albert Einstein speaking clip",
  "Winston Churchill speech clip",
  "Mahatma Gandhi short footage",
  "Marilyn Monroe brief interview",
  "JFK speech clip",
  "Muhammad Ali short clip",
  "Nelson Mandela short clip",
  "The Beatles clip Ed Sullivan",
  "Wright Brothers flight clip",
  "Charlie Chaplin brief scene",
  "Hiroshima bombing short footage",
  "Berlin Wall fall clip",
  "Rosa Parks short interview",
  "Elvis Presley short performance",
  "Titanic short footage",
  "Marie Curie brief footage",
  "Olympic Games historic short clip",
];

// Function to search Internet Archive
async function searchInternetArchive(query, maxResults = 10) {
  try {
    // First try to find explicitly short clips
    const shortClipQuery = `${query} AND (clip OR short OR seconds OR brief) AND mediatype:movies`;
    console.log(`Searching for short clips with query: ${shortClipQuery}`);

    const response = await axios.get("https://archive.org/advancedsearch.php", {
      params: {
        q: shortClipQuery,
        fl: "identifier,title,description,runtime,downloads",
        sort: "downloads desc",
        rows: maxResults,
        page: 1,
        output: "json",
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });

    let results = response.data.response.docs;

    // If no results found with the short clips query, fall back to more general search
    if (results.length === 0) {
      console.log(`No short clips found, trying general search for: ${query}`);
      const generalResponse = await axios.get(
        "https://archive.org/advancedsearch.php",
        {
          params: {
            q: `${query} AND mediatype:movies`,
            fl: "identifier,title,description,runtime,downloads",
            sort: "downloads desc",
            rows: maxResults,
            page: 1,
            output: "json",
          },
          httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        }
      );

      results = generalResponse.data.response.docs;
    }

    return results;
  } catch (error) {
    console.error(`Error searching for "${query}":`, error.message);
    return [];
  }

  return downloadedClips;
}

// Function to get file details for an identifier
async function getFileDetails(identifier) {
  try {
    const response = await axios.get(
      `https://archive.org/metadata/${identifier}`
    );
    const files = response.data.files || [];
    const metadata = response.data.metadata || {};

    // Get duration from metadata if available
    let itemDuration = null;
    if (metadata.runtime) {
      // Try to parse runtime - could be in various formats
      const runtimeStr = metadata.runtime;
      if (typeof runtimeStr === "string") {
        // Handle formats like "3:45", "3 min 45 sec", "3.75 minutes"
        if (runtimeStr.includes(":")) {
          const [min, sec] = runtimeStr.split(":").map(Number);
          itemDuration = min * 60 + sec;
        } else if (runtimeStr.includes("min")) {
          const match = runtimeStr.match(
            /(\d+)\s*min(?:utes?)?(?:\s*(\d+)\s*sec(?:onds?)?)?/i
          );
          if (match) {
            itemDuration =
              parseInt(match[1]) * 60 + (match[2] ? parseInt(match[2]) : 0);
          }
        } else {
          // Try to parse as a number (usually in minutes)
          const parsed = parseFloat(runtimeStr);
          if (!isNaN(parsed)) {
            // Assume it's in minutes if > 10, seconds otherwise
            itemDuration = parsed > 10 ? parsed * 60 : parsed;
          }
        }
      }
    }

    console.log(
      `Item duration from metadata: ${
        itemDuration ? itemDuration + " seconds" : "unknown"
      }`
    );

    // Filter for MP4 files only and limit size to 5MB
    let videoFiles = files.filter((file) => {
      // Check if it's an MP4 file
      const isMP4 =
        file.name.toLowerCase().endsWith(".mp4") ||
        (file.format && file.format.includes("MP4"));

      // Check if file size is under 5MB
      const sizeInMB = parseInt(file.size || 0) / 1024 / 1024;
      const isUnder5MB = sizeInMB <= 5;

      if (isMP4 && !isUnder5MB) {
        console.log(
          `  Found MP4 file but it's too large: ${
            file.name
          } (${sizeInMB.toFixed(2)} MB)`
        );
      }

      return isMP4 && isUnder5MB;
    });

    if (videoFiles.length > 0) {
      console.log(`Found ${videoFiles.length} MP4 files under 5MB`);

      // Log file details
      videoFiles.forEach((file, i) => {
        const sizeMB = (parseInt(file.size || 0) / 1024 / 1024).toFixed(2);
        const duration = file.length ? `${file.length}s` : "unknown length";
        console.log(
          `  MP4 file #${i + 1}: ${file.name} (${sizeMB} MB, ${duration})`
        );
      });
    } else {
      console.log(`  No suitable MP4 files under 5MB found`);
    }

    return videoFiles;
  } catch (error) {
    console.error(
      `Error getting file details for ${identifier}:`,
      error.message
    );
    return [];
  }
}

// Function to download a file
async function downloadFile(url, outputPath) {
  const writer = fs.createWriteStream(outputPath);

  try {
    const response = await axios({
      method: "get",
      url: url,
      responseType: "stream",
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
  } catch (error) {
    writer.close();
    fs.unlinkSync(outputPath); // Delete incomplete file
    throw error;
  }
}

// Function to check if a file is likely a short clip
function isLikelyShortClip(file, result) {
  // If we have explicit length information
  if (file.length) {
    const lengthInSeconds = parseFloat(file.length);
    if (lengthInSeconds <= 30) {
      console.log(
        `  Video has explicit length of ${lengthInSeconds} seconds - good candidate!`
      );
      return true;
    }
  }

  // Check file size (very small files are more likely to be short)
  const fileSizeMB = parseInt(file.size || 0) / 1024 / 1024;
  if (fileSizeMB < 5) {
    console.log(
      `  Small file size (${fileSizeMB.toFixed(2)} MB) - likely a short clip`
    );
    return true;
  }

  // Check title and description for hints
  const titleLower = result.title.toLowerCase();
  const descLower = (result.description || "").toLowerCase();

  const shortClipIndicators = [
    "clip",
    "short",
    "brief",
    "seconds",
    "3 sec",
    "5 sec",
    "10 sec",
    "snippet",
    "excerpt",
  ];

  for (const indicator of shortClipIndicators) {
    if (titleLower.includes(indicator) || descLower.includes(indicator)) {
      console.log(
        `  Found "${indicator}" in title/description - likely a short clip`
      );
      return true;
    }
  }

  // Check file name for indicators
  const fileNameLower = file.name.toLowerCase();
  for (const indicator of shortClipIndicators) {
    if (fileNameLower.includes(indicator)) {
      console.log(`  Found "${indicator}" in filename - likely a short clip`);
      return true;
    }
  }

  return false;
}

// Main function to execute the script
async function main() {
  const downloadedClips = [];
  const MAX_CLIP_SIZE_MB = 50; // Maximum file size to consider (in MB)

  for (const query of searchQueries) {
    if (downloadedClips.length >= 20) break; // Stop once we have 20 clips

    console.log(`\n======== Searching for: ${query} ========`);
    const searchResults = await searchInternetArchive(query);

    if (searchResults.length === 0) {
      console.log(`No results found for "${query}"`);
      continue;
    }

    let downloaded = false;

    for (const result of searchResults) {
      if (downloaded) break;

      console.log(`\nFound: ${result.title}`);
      console.log(`Identifier: ${result.identifier}`);

      // Check result runtime if available
      if (result.runtime) {
        console.log(`Runtime from search: ${result.runtime}`);
        // Try to determine if this is a short clip based on the runtime info
        const runtimeLower = result.runtime.toLowerCase();
        if (
          runtimeLower.includes("sec") ||
          (runtimeLower.match(/^\d+$/) && parseInt(runtimeLower) < 30) || // Just a number under 30
          (runtimeLower.match(/^\d+:\d+$/) &&
            parseInt(runtimeLower.split(":")[0]) === 0) // 0:XX format
        ) {
          console.log(`  This appears to be a short clip based on runtime!`);
        } else if (
          runtimeLower.includes("min") ||
          runtimeLower.includes("hour") ||
          parseInt(result.runtime) > 60
        ) {
          console.log(
            `  This appears to be longer content, but checking for clip files within it`
          );
        }
      }

      const files = await getFileDetails(result.identifier);

      if (files.length === 0) {
        console.log("No suitable video files found");
        continue;
      }

      // Prioritize files that are likely short clips
      const rankedFiles = files.sort((a, b) => {
        const aIsClip = isLikelyShortClip(a, result) ? 1 : 0;
        const bIsClip = isLikelyShortClip(b, result) ? 1 : 0;

        if (aIsClip !== bIsClip) return bIsClip - aIsClip; // Clips come first

        // If both or neither are clips, prefer smaller files
        const sizeA = parseInt(a.size || Number.MAX_SAFE_INTEGER);
        const sizeB = parseInt(b.size || Number.MAX_SAFE_INTEGER);
        return sizeA - sizeB;
      });

      for (const file of rankedFiles) {
        if (downloaded) break;

        try {
          const fileUrl = `https://archive.org/download/${result.identifier}/${file.name}`;
          const sanitizedQuery = query.replace(/[^a-zA-Z0-9]/g, "_");
          const outputFilename = `${sanitizedQuery}_${result.identifier}_${
            downloadedClips.length + 1
          }.mp4`;
          const outputPath = path.join(OUTPUT_DIR, outputFilename);

          const fileSizeMB =
            Math.round((parseInt(file.size || 0) / 1024 / 1024) * 100) / 100;
          console.log(`Downloading: ${file.name} (${fileSizeMB} MB)`);

          if (fileSizeMB > MAX_CLIP_SIZE_MB) {
            console.log(
              `  WARNING: This file is quite large (${fileSizeMB} MB), likely not a short clip`
            );
            console.log(`  Skipping and trying next candidate...`);
            continue;
          }

          await downloadFile(fileUrl, outputPath);

          console.log(`Successfully downloaded to: ${outputFilename}`);
          downloadedClips.push({
            query,
            identifier: result.identifier,
            title: result.title,
            path: outputPath,
            sizeMB: fileSizeMB,
            duration: file.length || "unknown",
          });

          downloaded = true;
        } catch (error) {
          console.error(`Error downloading file:`, error.message);
          continue;
        }
      }
    }

    if (!downloaded) {
      console.log(`Could not download any clips for "${query}"`);
    }
  }

  console.log("\n--- Download Summary ---");
  console.log(`Total clips downloaded: ${downloadedClips.length}`);

  // Log the details of all downloaded clips
  downloadedClips.forEach((clip, index) => {
    console.log(`\n${index + 1}. ${clip.title}`);
    console.log(`   Query: ${clip.query}`);
    console.log(`   File: ${path.basename(clip.path)}`);
    console.log(`   Size: ${clip.sizeMB} MB`);
    console.log(`   Duration: ${clip.duration}`);
  });

  // Add information about trimming possibilities
  if (checkFFmpeg()) {
    console.log("\n--- Post-Processing Options ---");
    console.log(
      "FFmpeg is available. If you want to trim these clips to exactly 3 seconds, you can use:"
    );
    console.log("\nExample command to trim a clip:");
    console.log(
      'ffmpeg -i "input.mp4" -ss 00:00:05 -t 00:00:03 -c:v copy -c:a copy "output_trimmed.mp4"'
    );
    console.log("\nWhere:");
    console.log("  -ss 00:00:05    = start at 5 seconds into the video");
    console.log("  -t 00:00:03     = take exactly 3 seconds of content");
  }
}

// Check if FFmpeg is installed (optional but useful for potential future clip trimming)
function checkFFmpeg() {
  try {
    execSync("ffmpeg -version", { stdio: "ignore" });
    return true;
  } catch (error) {
    console.warn(
      "Warning: FFmpeg is not installed. You might need it for video processing."
    );
    return false;
  }
}

// Function to automatically trim downloaded videos
async function trimDownloadedVideos(downloadedClips) {
  if (!checkFFmpeg()) {
    console.log("Cannot trim videos: FFmpeg is not installed");
    return;
  }

  const trimmedDir = path.join(OUTPUT_DIR, "trimmed");
  if (!fs.existsSync(trimmedDir)) {
    fs.mkdirSync(trimmedDir, { recursive: true });
  }

  console.log("\n--- Trimming Videos to 3 Seconds ---");

  for (const clip of downloadedClips) {
    const inputPath = clip.path;
    const outputFilename = `trimmed_${path.basename(clip.path)}`;
    const outputPath = path.join(trimmedDir, outputFilename);

    try {
      console.log(`Trimming: ${path.basename(inputPath)}`);
      // Take 3 seconds from the beginning
      execSync(
        `ffmpeg -i "${inputPath}" -ss 00:00:00 -t 00:00:03 -c:v copy -c:a copy "${outputPath}"`,
        { stdio: "ignore" }
      );
      console.log(`  Successfully trimmed to: ${outputFilename}`);
    } catch (error) {
      console.error(`  Error trimming video: ${error.message}`);
    }
  }

  console.log(`\nAll trimmed videos saved to: ${trimmedDir}`);
}

// Function to ask user if they want to trim videos
function askForTrimming(downloadedClips) {
  if (downloadedClips.length === 0) return;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question(
    "\nWould you like to automatically trim all downloaded videos to 3 seconds? (y/n): ",
    (answer) => {
      if (answer.toLowerCase() === "y" || answer.toLowerCase() === "yes") {
        trimDownloadedVideos(downloadedClips);
      } else {
        console.log(
          "Videos will not be trimmed. You can manually trim them using FFmpeg."
        );
      }
      rl.close();
    }
  );
}

// Run the script
console.log("Internet Archive MP4 Clip Downloader (max 5MB)");
console.log("------------------------------------------");

main()
  .then((downloadedClips) => {
    if (checkFFmpeg()) {
      askForTrimming(downloadedClips);
    }
  })
  .catch((error) => {
    console.error("Script execution failed:", error);
  });
