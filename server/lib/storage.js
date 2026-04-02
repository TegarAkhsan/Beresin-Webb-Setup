import { createClient } from '@supabase/supabase-js';

let _supabase = null;

// Lazy init — only create client when SUPABASE_URL is actually set
// This prevents crash on startup if env vars are not configured yet
function getSupabaseClient() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;

    if (!url || !key || url === 'your-service-role-key-here') {
        return null; // Storage not configured, will gracefully skip uploads
    }

    if (!_supabase) {
        _supabase = createClient(url, key);
    }
    return _supabase;
}

/**
 * Upload a file buffer to Supabase Storage
 * @param {Buffer} buffer  - File buffer from multer memoryStorage
 * @param {string} bucket  - Bucket name (e.g. 'beresin-uploads')
 * @param {string} fileName - Unique file path
 * @param {string} mimeType - MIME type of the file
 * @returns {string} Public URL of the uploaded file
 */
export async function uploadToStorage(buffer, bucket, fileName, mimeType) {
    const supabase = getSupabaseClient();

    if (!supabase) {
        throw new Error('Supabase Storage belum dikonfigurasi. Tambahkan SUPABASE_URL dan SUPABASE_SERVICE_KEY ke Netlify Environment Variables.');
    }

    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, buffer, {
            contentType: mimeType,
            upsert: true
        });

    if (error) {
        console.error('[SUPABASE STORAGE ERROR]', error);
        throw new Error('File upload failed: ' + error.message);
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return urlData.publicUrl;
}

/**
 * Check if Supabase Storage is configured
 */
export function isStorageConfigured() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    return !!(url && key && key !== 'your-service-role-key-here');
}
