import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATASET_FILE = '/tmp/ex-dataset/data/exercises.json';
const SEED_FILE = path.resolve(__dirname, '../data/exercises_supabase_seed.json');

if (!fs.existsSync(DATASET_FILE)) {
  console.error('Dataset not found at', DATASET_FILE);
  process.exit(1);
}

const fullData = JSON.parse(fs.readFileSync(DATASET_FILE, 'utf-8'));
const currentSeed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));

// Build lookup map by exact ID, and normalized name
const datasetById = new Map();
const datasetByName = new Map();

fullData.forEach(item => {
  datasetById.set(item.id, item);
  const normName = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  datasetByName.set(normName, item);
});

console.log(`OpenGym dataset loaded: ${fullData.length} exercises.`);

// Muscle map from dataset target/body_part to our 18 canonical slugs
function mapMuscle(target, bodyPart) {
  const t = (target || '').toLowerCase();
  const b = (bodyPart || '').toLowerCase();

  if (t.includes('pec') || t.includes('chest') || b.includes('chest')) return ['chest'];
  if (t.includes('lat') || t.includes('back') || b.includes('back')) return ['back'];
  if (t.includes('bicep')) return ['biceps'];
  if (t.includes('tricep')) return ['triceps'];
  if (t.includes('delt') || t.includes('shoulder') || b.includes('shoulder')) return ['shoulders'];
  if (t.includes('quad') || b.includes('upper legs')) return ['quads'];
  if (t.includes('hamstring') || t.includes('glute')) return ['glutes', 'hamstrings'];
  if (t.includes('calve') || b.includes('lower legs')) return ['calves'];
  if (t.includes('abs') || t.includes('waist') || b.includes('waist') || t.includes('core')) return ['abs'];
  if (t.includes('forearm')) return ['forearms'];
  if (t.includes('trap')) return ['traps'];
  return ['chest']; // default fallback
}

// 1. Update existing seed exercises
let matched = 0;
const updatedSeed = currentSeed.map(ex => {
  const normName = ex.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const match = datasetByName.get(normName) || fullData.find(d => normName.includes(d.name.toLowerCase().replace(/[^a-z0-9]/g, '')));

  if (match) {
    matched++;
    return {
      ...ex,
      dataset_id: match.id,
      image_file: match.image,
      gif_file: match.gif_url,
      thumbnail_url: `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/${match.image}`,
      motion_gif_url: `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/${match.gif_url}`
    };
  }
  return ex;
});

console.log(`Updated current seed: ${matched}/${currentSeed.length} matched.`);

// 2. Also append all remaining exercises from OpenGym dataset (1324 total) to guarantee full library
const existingNames = new Set(updatedSeed.map(e => e.name.toLowerCase().replace(/[^a-z0-9]/g, '')));
let addedFromDataset = 0;

fullData.forEach((d, idx) => {
  const normName = d.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!existingNames.has(normName)) {
    const primary = mapMuscle(d.target, d.body_part);
    const instructions = Array.isArray(d.instruction_steps?.en)
      ? d.instruction_steps.en
      : (typeof d.instructions?.en === 'string' ? [d.instructions.en] : ['Perform the exercise with controlled form.']);

    updatedSeed.push({
      id: `opengym_${d.id}`,
      name: d.name.charAt(0).toUpperCase() + d.name.slice(1),
      name_vi: d.name.charAt(0).toUpperCase() + d.name.slice(1),
      category: d.equipment === 'body weight' ? 'calisthenics' : (d.equipment === 'dumbbell' || d.equipment === 'barbell' ? 'home' : 'gym'),
      equipment: d.equipment || 'body weight',
      primary_muscles: primary,
      secondary_muscles: d.secondary_muscles ? d.secondary_muscles.map(m => mapMuscle(m, '')[0]) : [],
      level: 'intermediate',
      mechanic: 'compound',
      force: 'push',
      instructions: instructions,
      dataset_id: d.id,
      image_file: d.image,
      gif_file: d.gif_url,
      thumbnail_url: `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/${d.image}`,
      motion_gif_url: `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/${d.gif_url}`
    });
    existingNames.add(normName);
    addedFromDataset++;
  }
});

console.log(`Added ${addedFromDataset} new exercises from dataset.`);
console.log(`Total exercises in seed now: ${updatedSeed.length}`);

fs.writeFileSync(SEED_FILE, JSON.stringify(updatedSeed, null, 2));
console.log('Saved to data/exercises_supabase_seed.json successfully!');
