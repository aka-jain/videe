import ffmpeg from "fluent-ffmpeg";
import { executeFFmpegAsync } from "../utils/ffmpegPromises";
import { ensureOutputDirExists } from "../utils/index";
import fs from "fs";
import path from "path";

async function createSlideshowFromImages() {
    const imageDir = "output-thing/images-thing";
    const outputPath = "gl_demo.mp4";

    // Get all image files
    const imageFiles = fs.readdirSync(imageDir)
        .filter(file => file.endsWith('.jpg'))
        .sort()
        .map(file => path.join(imageDir, file));

    console.log(`Found ${imageFiles.length} images`);

    // Ensure output directory exists
    ensureOutputDirExists(outputPath);

    // Create ffmpeg command for slideshow
    const command = ffmpeg();

    // Add all images as inputs
    imageFiles.forEach(imagePath => {
        command.input(imagePath)
            .inputOptions(['-loop', '1', '-t', '2']); // Each image for 2 seconds
    });

    // Create filter complex for transitions
    const filterParts: string[] = [];
    const inputLabels: string[] = [];

    // Scale all inputs to same size first
    imageFiles.forEach((_, index) => {
        filterParts.push(`[${index}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:-1:-1:color=black,setsar=1,fps=30[v${index}]`);
        inputLabels.push(`[v${index}]`);
    });

    // Create transitions between images
    let currentLabel = '[v0]';
    for (let i = 1; i < imageFiles.length; i++) {
        const nextLabel = `[v${i}]`;
        const outputLabel = i === imageFiles.length - 1 ? '[final]' : `[t${i}]`;

        // Add a simple fade transition
        filterParts.push(`${currentLabel}${nextLabel}xfade=transition=fade:duration=0.5:offset=${1.5 + (i - 1) * 2}${outputLabel}`);
        currentLabel = outputLabel;
    }

    const filterComplex = filterParts.join(';');

    command
        .complexFilter(filterComplex)
        .outputOptions([
            '-map', '[final]',
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-preset', 'medium',
            '-crf', '23',
            '-r', '30'
        ])
        .output(outputPath);

    try {
        await executeFFmpegAsync(command, outputPath, "Creating slideshow with transitions");
        console.log(`✅ Slideshow created successfully: ${outputPath}`);
    } catch (error) {
        console.error("❌ Error creating slideshow:", error);
        throw error;
    }
}

// Run the function
createSlideshowFromImages().catch(console.error); 