import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Upload a file buffer to Supabase Storage
 * @param {Buffer} buffer - File buffer from multer memoryStorage
 * @param {string} bucket - Bucket name (e.g. 'payment-proofs', 'results')
 * @param {string} fileName - Unique file name
 * @param {string} mimeType - MIME type of the file
 * @returns {string} Public URL of the uploaded file
 */
export async function uploadToStorage(buffer, bucket, fileName, mimeType) {
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
