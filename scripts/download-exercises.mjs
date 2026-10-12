import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEED_FILE = path.resolve(__dirname, '../data/exercises_supabase_seed.json');
const ASSETS_DIR = path.resolve(__dirname, '../artifacts/train-xp/assets/exercises');

if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

const exercises = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));
console.log(`Loaded ${exercises.length} exercises to download.`);

async function downloadFile(url, dest) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 100) {
    return true; // Already downloaded
  }
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Failed ${url}: status ${res.status}`);
      return false;
    }
    const buffer = await res.arrayBuffer();
    fs.writeFileSync(dest, Buffer.from(buffer));
    return true;
  } catch (err) {
    console.error(`Error ${url}:`, err.message);
    return false;
  }
}

async function run() {
  let doneCount = 0;
  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    const exFolder = path.join(ASSETS_DIR, ex.id);
    if (!fs.existsSync(exFolder)) {
      fs.mkdirSync(exFolder, { recursive: true });
    }

    const tasks = [];
    if (ex.thumbnail_url) {
      tasks.push(downloadFile(ex.thumbnail_url, path.join(exFolder, '0.jpg')));
    }
    if (ex.image_end_url) {
      tasks.push(downloadFile(ex.image_end_url, path.join(exFolder, '1.jpg')));
    }
    if (ex.motion_gif_url && !ex.motion_gif_url.includes('exercisedb.io')) {
      tasks.push(downloadFile(ex.motion_gif_url, path.join(exFolder, 'motion.gif')));
    }

    await Promise.all(tasks);
    doneCount++;
    if (doneCount % 10 === 0 || doneCount === exercises.length) {
      console.log(`[${doneCount}/${exercises.length}] Downloaded images for ${ex.name}`);
    }
  }
  console.log('Finished all exercise asset downloads.');
}

run();
