import multer from 'multer';

// Separate from app.js to avoid circular import issues
// (route files import this, app.js imports route files)
export const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});
