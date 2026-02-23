/* index.js
   Usage: node index.js [pathToImagesDir]  (default = "./assets")
*/
import fs from "fs";
import path from "path";
import editly from "editly";

// ── config ────────────────────────────────────────────────────────────────
const IMAGES_DIR = "output-thing/images-thing";
const MAX_CLIPS = 22; // use at most 30 images
const DURATION_PER_CLIP = 3; // seconds each
const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;
const OUT_PATH = "out.mp4";

// editly’s built-in transition names (30 unique)
const TRANSITIONS = [
  "directional-left",
  "directional-right",
  "directional-up",
  "directional-down",
  "directionalWarp",
  "dreamyzoom",
  "crosszoom",
  "colorphase",
  "fade",
  "fadegrayscale",
  // "circle",
  // "circleopen",
  // "circleclose",
  "wipeleft",
  "wiperight",
  // "wipeup",
  // "wipedown",
  "randomBars",
  "glitch",
  "radial",
  "flyeye",
  "blur",
  "wind",
  "sliced",
  "paintbrush",
  "zoom",
  "zoomrotate",
  "crossfade",
  "doorway",
  "simplezoom",
];

// ── utility: random shuffle ───────────────────────────────────────────────
function shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ── read images from directory ────────────────────────────────────────────
function loadImages(dir) {
  if (!fs.existsSync(dir)) throw new Error(`Directory not found → ${dir}`);

  const files = fs
    .readdirSync(dir)
    .filter((f) => /\.(jpe?g|png)$/i.test(f))
    .map((f) => path.join(dir, f));

  if (files.length === 0)
    throw new Error(`No .jpg / .jpeg / .png images found in ${dir}`);

  return shuffle(files).slice(0, MAX_CLIPS);
}

// ── build editly spec ─────────────────────────────────────────────────────
function buildClips(imagePaths) {
  return imagePaths.map((file, i) => {
    const transition = TRANSITIONS[i % TRANSITIONS.length];
    console.log(transition);
    return {
      duration: DURATION_PER_CLIP,
      transition: { name: TRANSITIONS[i % TRANSITIONS.length], duration: 0.7 },
      layers: [
        {
          type: "image",
          path: file,
          zoomDirection: i % 2 ? "in" : "out", // alternate zoom style
          // subtle Ken-Burns moves
          zoomAmount: 1.15,
          startZoom: 1.0,
          endZoom: 1.15,
        },
        // Fancy text every 4th slide
        ...(i % 4 === 0
          ? [
              {
                type: "title",
                text: `Frame ${i + 1}`,
                position: "center",
                textAlign: "center",
                color: "#ffffff",
                fontSize: 48,
                backgroundColor: "rgba(0,0,0,0.35)",
              },
            ]
          : []),
      ],
    };
  });
}

// ── main ──────────────────────────────────────────────────────────────────
(async () => {
  console.time("render");

  const images = loadImages(IMAGES_DIR);
  const clips = buildClips(images);

  await editly({
    width: WIDTH,
    height: HEIGHT,
    fps: FPS,
    outPath: OUT_PATH,
    defaults: { transition: null },
    clips,
  });

  console.timeEnd("render");
  console.log(`🎉  Finished! Video saved to ${OUT_PATH}`);
})();
