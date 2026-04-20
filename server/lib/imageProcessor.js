/**
 * imageProcessor.js
 * Utility untuk otomatis compress gambar sebelum upload ke Supabase Storage.
 * Menggunakan `sharp` untuk konversi, resize, dan quality reduction.
 */

import sharp from 'sharp';

// MIME types yang dianggap sebagai gambar dan akan diproses
const IMAGE_MIME_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/heic',
    'image/heif',
    'image/tiff',
    'image/bmp',
    'image/gif',
]);

// File extension yang dianggap sebagai gambar
const IMAGE_EXTENSIONS = new Set([
    'jpg', 'jpeg', 'png', 'webp', 'avif', 'heic', 'heif', 'tiff', 'bmp', 'gif'
]);

/**
 * Cek apakah file adalah gambar berdasarkan MIME type atau ekstensi
 */
export function isImageFile(mimeType, fileName = '') {
    if (mimeType && IMAGE_MIME_TYPES.has(mimeType.toLowerCase())) return true;
    if (fileName) {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (ext && IMAGE_EXTENSIONS.has(ext)) return true;
    }
    return false;
}

/**
 * Kompres gambar menggunakan sharp
 *
 * Strategi:
 * - Resize maks 1920x1920 (jaga aspek rasio)
 * - Output WebP untuk semua format (format terbaik untuk web)
 * - Kualitas adaptif berdasarkan ukuran file asal
 * - GIF tidak diproses (bisa animasi)
 *
 * @param {Buffer} buffer    - Buffer gambar original
 * @param {string} mimeType  - MIME type asli file
 * @param {string} fileName  - Nama file asli (untuk ekstensi)
 * @param {object} options   - Opsi tambahan
 * @returns {{ buffer: Buffer, mimeType: string, ext: string, originalSize: number, compressedSize: number }}
 */
export async function compressImage(buffer, mimeType, fileName = '', options = {}) {
    const originalSize = buffer.length;
    const isGif = mimeType === 'image/gif' || fileName.toLowerCase().endsWith('.gif');

    // GIF tidak diproses karena kemungkinan animasi
    if (isGif) {
        return {
            buffer,
            mimeType,
            ext: 'gif',
            originalSize,
            compressedSize: originalSize,
            wasCompressed: false,
        };
    }

    // Matikan cache sharp untuk mencegah memory leak di Netlify/Lambda
    sharp.cache(false);

    // Pilih kualitas berdasarkan ukuran file asal
    // File besar → kualitas lebih rendah; file kecil → kualitas lebih tinggi
    let quality = 80; // default
    if (originalSize > 5 * 1024 * 1024)       quality = 65; // > 5MB
    else if (originalSize > 2 * 1024 * 1024)  quality = 70; // > 2MB
    else if (originalSize > 1 * 1024 * 1024)  quality = 75; // > 1MB
    else if (originalSize < 200 * 1024)       quality = 85; // < 200KB → preserve quality

    // Gunakan resolusi 1280x1280 agar lebih ringan di proses CPU serverless/Netlify
    const maxWidth  = options.maxWidth  || 1280;
    const maxHeight = options.maxHeight || 1280;

    try {
        const compressedBuffer = await sharp(buffer)
            .rotate()                          // Auto-rotate berdasarkan EXIF orientation
            .resize(maxWidth, maxHeight, {
                fit: 'inside',                 // Tidak memperbesar gambar kecil
                withoutEnlargement: true,
                fastShrinkOnLoad: true         // Percepat proses load jpeg
            })
            // Gunakan effort: 1 atau 2 untuk speed kompresi di Netlify (default 4 terlalu lambat untuk ukuran besar)
            .webp({ quality, effort: 1 })      
            .toBuffer();

        const compressionRatio = ((1 - compressedBuffer.length / originalSize) * 100).toFixed(1);

        console.log(
            `[IMAGE COMPRESS] ${fileName || 'unknown'} | ` +
            `${(originalSize / 1024).toFixed(0)}KB → ${(compressedBuffer.length / 1024).toFixed(0)}KB ` +
            `(${compressionRatio}% smaller) | q=${quality}`
        );

        return {
            buffer: compressedBuffer,
            mimeType: 'image/webp',
            ext: 'webp',
            originalSize,
            compressedSize: compressedBuffer.length,
            wasCompressed: true,
        };
    } catch (err) {
        // Jika sharp gagal (format tidak support, file corrupt), gunakan buffer asli
        console.warn(`[IMAGE COMPRESS] Failed to compress "${fileName}", using original: ${err.message}`);
        const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
        return {
            buffer,
            mimeType,
            ext,
            originalSize,
            compressedSize: originalSize,
            wasCompressed: false,
        };
    }
}

/**
 * Validasi file upload — cek ukuran dan tipe yang diizinkan
 *
 * @param {object} file       - Multer file object { mimetype, size, originalname }
 * @param {object} rules      - Aturan validasi
 * @returns {{ valid: boolean, message: string }}
 */
export function validateFile(file, rules = {}) {
    const {
        maxSizeMB = 10,
        allowedTypes = null,  // null = semua tipe diizinkan
        imageOnly  = false,
    } = rules;

    if (!file) {
        return { valid: false, message: 'Tidak ada file yang dikirim.' };
    }

    // Cek ukuran
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
        return {
            valid: false,
            message: `Ukuran file terlalu besar. Maksimum ${maxSizeMB}MB, file Anda: ${(file.size / 1024 / 1024).toFixed(2)}MB.`
        };
    }

    // Cek tipe jika imageOnly
    if (imageOnly && !isImageFile(file.mimetype, file.originalname)) {
        return {
            valid: false,
            message: 'Hanya file gambar yang diizinkan (JPEG, PNG, WebP, dll).'
        };
    }

    // Cek allowedTypes jika ditentukan
    if (allowedTypes && !allowedTypes.includes(file.mimetype)) {
        return {
            valid: false,
            message: `Tipe file "${file.mimetype}" tidak diizinkan.`
        };
    }

    return { valid: true, message: 'OK' };
}
