import { createClient } from '@supabase/supabase-js';
import { isImageFile, compressImage } from './imageProcessor.js';

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
 * Upload a file buffer to Supabase Storage.
 * Gambar akan otomatis dikompres ke WebP sebelum diupload.
 *
 * @param {Buffer} buffer    - File buffer dari multer memoryStorage
 * @param {string} bucket    - Bucket name (e.g. 'beresin-uploads')
 * @param {string} fileName  - Unique file path (tanpa ekstensi jika gambar — akan diganti .webp)
 * @param {string} mimeType  - MIME type dari file
 * @param {object} options   - Opsi kompresi { maxWidth, maxHeight, skipCompression }
 * @returns {string}         - Public URL file yang diupload
 */
export async function uploadToStorage(buffer, bucket, fileName, mimeType, options = {}) {
    const supabase = getSupabaseClient();

    if (!supabase) {
        throw new Error('Supabase Storage belum dikonfigurasi. Tambahkan SUPABASE_URL dan SUPABASE_SERVICE_KEY ke Netlify Environment Variables.');
    }

    let uploadBuffer = buffer;
    let uploadMime   = mimeType;
    let uploadPath   = fileName;

    // --- Kompresi Otomatis untuk Gambar ---
    if (!options.skipCompression && isImageFile(mimeType, fileName)) {
        const result = await compressImage(buffer, mimeType, fileName, {
            maxWidth:  options.maxWidth  || 1920,
            maxHeight: options.maxHeight || 1920,
        });

        uploadBuffer = result.buffer;
        uploadMime   = result.mimeType;

        // Ganti ekstensi file dengan .webp jika berhasil dikompres
        if (result.wasCompressed) {
            uploadPath = fileName.replace(/\.[^.]+$/, '') + '.webp';
        }
    }

    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(uploadPath, uploadBuffer, {
            contentType: uploadMime,
            upsert: true,
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
