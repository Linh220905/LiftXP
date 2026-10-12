import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUCKET_NAME = 'liftxp-exercises';
const ENDPOINT = 'https://4dc394bd485fb24792dc3f1ae9412a95.r2.cloudflarestorage.com';
const ACCESS_KEY_ID = 'c12d9022fcf7e340275e3313a4076502';
const SECRET_ACCESS_KEY = '74f759d7f6b965c7e2ee5493bad348d429f9bd5906620e480dc630757641aa6e';

const ASSETS_BASE = path.resolve(__dirname, '../artifacts/train-xp/assets/exercises');

const s3 = new S3Client({
  region: 'auto',
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

function getFiles(dir, prefix = '') {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getFiles(fullPath, path.join(prefix, file)));
    } else {
      results.push({
        fullPath,
        key: path.join(prefix, file).replace(/\\/g, '/'),
        size: stat.size,
      });
    }
  }
  return results;
}

async function uploadFile(item) {
  const ext = path.extname(item.fullPath).toLowerCase();
  const contentType = ext === '.gif' ? 'image/gif' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/octet-stream';

  const fileStream = fs.createReadStream(item.fullPath);
  const cmd = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: item.key,
    Body: fileStream,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  });

  await s3.send(cmd);
}

async function main() {
  console.log('Scanning exercise media files in:', ASSETS_BASE);
  const images = getFiles(path.join(ASSETS_BASE, 'images'), 'images');
  const videos = getFiles(path.join(ASSETS_BASE, 'videos'), 'videos');
  const allFiles = [...images, ...videos];

  console.log(`Found ${allFiles.length} files (${images.length} images, ${videos.length} GIFs).`);
  const totalSizeMb = (allFiles.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(1);
  console.log(`Total payload: ${totalSizeMb} MB. Starting upload to R2...`);

  const CONCURRENCY = 25;
  let completed = 0;
  let errors = 0;
  const startTime = Date.now();

  async function worker(iterator) {
    for (const item of iterator) {
      try {
        await uploadFile(item);
        completed++;
        if (completed % 100 === 0 || completed === allFiles.length) {
          const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
          const percent = ((completed / allFiles.length) * 100).toFixed(1);
          console.log(`[${percent}%] Uploaded ${completed}/${allFiles.length} files (${elapsedSec}s)`);
        }
      } catch (err) {
        errors++;
        console.error(`Error uploading ${item.key}:`, err.message);
      }
    }
  }

  const iterator = allFiles[Symbol.iterator]();
  const workers = Array.from({ length: CONCURRENCY }, () => worker(iterator));
  await Promise.all(workers);

  const totalSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Upload complete! ${completed} succeeded, ${errors} failed in ${totalSec}s.`);
}

main().catch(console.error);
