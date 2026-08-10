import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const MAX_WIDTH = 400;
const MAX_HEIGHT = 600;
const WEBP_QUALITY = 0.8;

async function compressImageToWebp(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const aspectRatio = width / height;
          if (width > height) {
            width = MAX_WIDTH;
            height = Math.round(width / aspectRatio);
          } else {
            height = MAX_HEIGHT;
            width = Math.round(height * aspectRatio);
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to get canvas context');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (webpBlob) => {
            if (webpBlob) resolve(webpBlob);
            else reject(new Error('Failed to compress image'));
          },
          'image/webp',
          WEBP_QUALITY,
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
}

export async function uploadCoverToStorage(
  comicId: string,
  coverUrl: string,
): Promise<string | null> {
  if (!coverUrl) return null;

  try {
    const response = await fetch(coverUrl);
    if (!response.ok) throw new Error(`Failed to fetch cover: ${response.statusText}`);

    const blob = await response.blob();
    const compressedBlob = await compressImageToWebp(blob);

    const fileName = `${comicId}.webp`;
    const path = `covers/${fileName}`;

    const { data, error } = await supabase.storage
      .from('comic-covers')
      .upload(path, compressedBlob, { upsert: true, contentType: 'image/webp' });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from('comic-covers')
      .getPublicUrl(path);

    return publicUrlData?.publicUrl ?? null;
  } catch (error) {
    console.error('Cover upload failed:', error);
    return null;
  }
}
