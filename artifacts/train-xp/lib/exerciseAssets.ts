const R2_BASE_URL =
  process.env.EXPO_PUBLIC_EXERCISE_CDN_URL ||
  'https://pub-33f6c627cce748718337116d780396be.r2.dev';

export const EXERCISE_IMAGES: Record<string, any> = {};
export const EXERCISE_GIFS: Record<string, any> = {};

export function getExerciseImageUrl(imageFile?: string | null, fallbackUrl?: string | null): string | null {
  if (imageFile) {
    const clean = imageFile.replace(/^\/+/, '');
    const path = clean.startsWith('images/') ? clean : `images/${clean}`;
    return `${R2_BASE_URL}/${path}`;
  }
  if (fallbackUrl) {
    return fallbackUrl;
  }
  return null;
}

export function getExerciseImageSource(imageFile?: string | null, fallbackUrl?: string | null) {
  const url = getExerciseImageUrl(imageFile, fallbackUrl);
  if (url) {
    return { uri: url };
  }
  return null;
}

export function getExerciseGifUrl(gifFile?: string | null, fallbackUrl?: string | null): string | null {
  if (gifFile) {
    const clean = gifFile.replace(/^\/+/, '');
    const path = clean.startsWith('videos/') ? clean : `videos/${clean}`;
    return `${R2_BASE_URL}/${path}`;
  }
  if (fallbackUrl) {
    return fallbackUrl;
  }
  return null;
}

export function getExerciseGifSource(gifFile?: string | null, fallbackUrl?: string | null) {
  const url = getExerciseGifUrl(gifFile, fallbackUrl);
  if (url) {
    return { uri: url };
  }
  return null;
}
