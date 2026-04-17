import multer from 'multer';

// ─── Tipe file yang diizinkan ──────────────────────────────────────────────────
// Gambar → akan otomatis dikompres oleh imageProcessor
// Dokumen → diupload apa adanya
const ALLOWED_MIME_TYPES = new Set([
    // Gambar
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'image/avif', 'image/heic', 'image/heif', 'image/gif', 'image/bmp',
    // Dokumen
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',       // .xlsx
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'text/plain',
]);

// ─── Filter MIME type ──────────────────────────────────────────────────────────
function fileFilter(req, file, cb) {
    const mime = file.mimetype?.toLowerCase();
    const ext  = file.originalname?.split('.').pop()?.toLowerCase();

    // Ekstensi executable yang berbahaya — TOLAK
    const dangerousExt = new Set(['exe', 'sh', 'bat', 'cmd', 'ps1', 'jar', 'py', 'rb', 'php', 'asp', 'aspx']);
    if (ext && dangerousExt.has(ext)) {
        return cb(new Error(`Tipe file .${ext} tidak diizinkan karena alasan keamanan.`), false);
    }

    if (!mime || !ALLOWED_MIME_TYPES.has(mime)) {
        return cb(new Error(`Tipe file "${mime || ext}" tidak didukung.`), false);
    }

    cb(null, true);
}

// ─── Konfigurasi upload umum (10MB) ───────────────────────────────────────────
// Batas 10MB karena gambar akan dikompres otomatis sebelum disimpan ke Supabase
export const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter,
});

// ─── Konfigurasi upload khusus gambar saja (10MB) ─────────────────────────────
const IMAGE_ONLY_TYPES = new Set([
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'image/avif', 'image/heic', 'image/heif', 'image/gif', 'image/bmp',
]);

export const uploadImageOnly = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const mime = file.mimetype?.toLowerCase();
        if (!mime || !IMAGE_ONLY_TYPES.has(mime)) {
            return cb(new Error('Hanya file gambar yang diizinkan (JPEG, PNG, WebP, dll).'), false);
        }
        cb(null, true);
    },
});

// ─── Error handler untuk multer ───────────────────────────────────────────────
// Gunakan seperti: router.post('/route', upload.single('file'), handleMulterError, controller)
export function handleMulterError(err, req, res, next) {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ message: 'Ukuran file terlalu besar. Maksimum 10MB.' });
        }
        return res.status(400).json({ message: `Upload error: ${err.message}` });
    }
    if (err) {
        return res.status(400).json({ message: err.message });
    }
    next();
}
