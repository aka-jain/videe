function concatenateClips(fileListPath, outputFilePath) {
  // Read the list of video files
  const fileContents = fs.readFileSync(fileListPath, "utf8");
  const videoPaths = fileContents.split(/\r?\n/).filter(Boolean); // Remove empty lines

  // Check if videoPaths is not empty
  if (videoPaths.length === 0) {
    console.error("No video files found in the list.");
    return;
  }

  // Define a temporary directory for re-encoded clips
  const tempDir = "./temp_clips";
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  const tempFiles = [];

  // Process each video clip
  let promises = videoPaths.map((videoPath, index) => {
    return new Promise((resolve, reject) => {
      // Re-encode the video to a common format
      // Let's choose mp4 with h264 codec, and a common resolution
      const tempFile = path.join(tempDir, `clip${index}.mp4`);
      tempFiles.push(tempFile);

      const ffmpegArgs = [
        "-i",
        videoPath,
        "-c:v",
        "libx264",
        "-vf",
        "scale=1280:720,setsar=1:1",
        "-preset",
        "fast",
        "-c:a",
        "aac",
        "-y",
        tempFile,
      ];

      const ffmpegProcess = spawn("ffmpeg", ffmpegArgs);

      ffmpegProcess.stderr.on("data", (data) => {
        console.error(`FFmpeg stderr: ${data}`);
      });

      ffmpegProcess.on("close", (code) => {
        if (code !== 0) {
          console.error(`FFmpeg process exited with code ${code}`);
          reject(new Error(`Error processing ${videoPath}`));
        } else {
          console.log(`Processed ${videoPath}`);
          resolve();
        }
      });
    });
  });

  // After processing all videos
  return Promise.all(promises)
    .then(() => {
      // Create a file list for concatenation
      const concatListPath = path.join(tempDir, "concat_list.txt");
      const concatListContent = tempFiles
        .map((f) => `file '${f.replace(/'/g, "'\\''")}'`)
        .join("\n");
      fs.writeFileSync(concatListPath, concatListContent);

      // Run FFmpeg to concatenate the files
      const ffmpegConcatArgs = [
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        concatListPath,
        "-c",
        "copy",
        "-y",
        outputFilePath,
      ];

      const ffmpegConcatProcess = spawn("ffmpeg", ffmpegConcatArgs);

      ffmpegConcatProcess.stderr.on("data", (data) => {
        console.error(`FFmpeg stderr: ${data}`);
      });

      ffmpegConcatProcess.on("close", (code) => {
        if (code !== 0) {
          console.error(`FFmpeg concat process exited with code ${code}`);
        } else {
          console.log("Videos concatenated successfully.");

          // Clean up temporary files
          tempFiles.forEach((f) => fs.unlinkSync(f));
          fs.unlinkSync(concatListPath);
          fs.rmdirSync(tempDir);
        }
      });
    })
    .catch((err) => {
      console.error("Error processing videos:", err);
    });
}
