// AI-videogenerering via Higgsfield (https://higgsfield.ai) — från valfri prompt/text.
//
// Higgsfields API har ingen ren text-till-video-modell, så vi kör en tvåstegspipeline:
//   1) text-till-bild (flux-pro/kontext/max/text-to-image) skapar en stillbild från prompten
//   2) bild-till-video (DoP-modellen, /v1/image2video/dop) animerar bilden med samma prompt
// Det officiella SDK:et (@higgsfield/client) sköter auth, retries och statuspolling internt.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { higgsfield, DoPModel } from "@higgsfield/client/v2";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "videos.json");

const { HF_CREDENTIALS = "", HF_API_KEY = "", HF_API_SECRET = "" } = process.env;

const MAX_PROMPT_LEN = 1500;
const VALID_ASPECTS = new Set(["16:9", "9:16", "1:1"]);
const VALID_MODELS = new Set(Object.values(DoPModel)); // dop-lite, dop-turbo, dop-standard

function load() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); } catch { return []; }
}
function save(list) {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2)); } catch (e) { console.error("[video] save fail", e); }
}
let videos = load();

export function isVideoConfigured() {
  return Boolean(HF_CREDENTIALS || (HF_API_KEY && HF_API_SECRET));
}
export function getVideoModel() {
  return "Higgsfield (text→bild→video, DoP)";
}

function touch(job) { job.updatedAt = new Date().toISOString(); }

function describeHfResult(resp) {
  if (resp?.status === "nsfw") return "Innehållet flaggades av Higgsfields moderering (NSFW) och avvisades.";
  return "Genereringen misslyckades hos Higgsfield.";
}

async function runPipeline(job) {
  try {
    job.status = "generating_image"; touch(job); save(videos);

    const imgResult = await higgsfield.subscribe("flux-pro/kontext/max/text-to-image", {
      input: {
        prompt: job.prompt,
        aspect_ratio: job.aspectRatio,
        safety_tolerance: 2,
      },
      withPolling: true,
    });
    if (imgResult.status !== "completed") throw new Error(describeHfResult(imgResult));
    const imageUrl = imgResult.images?.[0]?.url;
    if (!imageUrl) throw new Error("Ingen bild-URL i svaret från Higgsfield (text-till-bild).");
    job.imageUrl = imageUrl;

    job.status = "generating_video"; touch(job); save(videos);

    const vidResult = await higgsfield.subscribe("/v1/image2video/dop", {
      input: {
        model: job.model,
        prompt: job.prompt,
        input_images: [{ type: "image_url", image_url: imageUrl }],
      },
      withPolling: true,
    });
    if (vidResult.status !== "completed") throw new Error(describeHfResult(vidResult));
    const videoUrl = vidResult.video?.url;
    if (!videoUrl) throw new Error("Ingen video-URL i svaret från Higgsfield (bild-till-video).");

    job.videoUrl = videoUrl;
    job.status = "succeeded";
  } catch (e) {
    job.status = "failed";
    job.error = String(e.message || e);
  }
  touch(job);
  save(videos);
}

export async function createVideoJob({ prompt, aspectRatio, model }) {
  if (!isVideoConfigured()) {
    throw new Error("AI-video är inte konfigurerad. Sätt miljövariabeln HF_CREDENTIALS (\"KEY_ID:KEY_SECRET\" från Higgsfield).");
  }
  prompt = String(prompt || "").trim();
  if (!prompt) throw new Error("Prompt krävs");
  if (prompt.length > MAX_PROMPT_LEN) throw new Error(`Prompten är för lång (max ${MAX_PROMPT_LEN} tecken)`);

  aspectRatio = VALID_ASPECTS.has(aspectRatio) ? aspectRatio : "16:9";
  model = VALID_MODELS.has(model) ? model : DoPModel.TURBO;

  const job = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    prompt,
    aspectRatio,
    model,
    status: "queued",
    imageUrl: null,
    videoUrl: null,
    error: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  videos.unshift(job);
  save(videos);

  // Kör pipelinen i bakgrunden — svara direkt till klienten, uppdatera jobbet allt eftersom.
  runPipeline(job).catch(e => console.error("[video] pipeline crash", e));

  return job;
}

export function listVideoJobs() {
  return videos;
}

export async function deleteVideoJob(id) {
  const existed = videos.some(j => j.id === id);
  if (!existed) return false;
  videos = videos.filter(j => j.id !== id);
  save(videos);
  return true;
}
