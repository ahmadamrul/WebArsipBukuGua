import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function uploadCoverToStorage(
  comicId: string,
  coverUrl: string,
): Promise<string | null> {
  if (!coverUrl) return null;

  try {
    const response = await fetch(coverUrl);
    if (!response.ok) throw new Error(`Failed to fetch cover: ${response.statusText}`);

    const blob = await response.blob();
    const fileName = `${comicId}.jpg`;
    const path = `covers/${fileName}`;

    const { data, error } = await supabase.storage
      .from('comic-covers')
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });

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
