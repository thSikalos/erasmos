const express = require('express');
const multer = require('multer');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const { 
    uploadFile, 
    getAttachments, 
    getDownloadUrl, 
    deleteAttachment, 
    getFileCategories, 
    getFileAnalytics 
} = require('../controllers/attachmentController');

// Configure multer for memory storage (we'll upload to S3 directly)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max file size
        files: 5 // Maximum 5 files per upload
    },
    fileFilter: (req, file, cb) => {
        // Allow specific file types
        const allowedMimes = [
            'application/pdf',
            'image/jpeg',
            'image/jpg', 
            'image/png',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'application/zip'
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
        }
    }
});

// Apply auth middleware to all routes
router.use(authMiddleware);

// File management routes
router.post('/:applicationId/upload', upload.single('file'), uploadFile);
router.get('/:applicationId', getAttachments);
router.get('/download/:id', getDownloadUrl);
router.delete('/:id', deleteAttachment);

// File categories and configuration
router.get('/config/categories', getFileCategories);

// Admin analytics (protected)
router.get('/admin/analytics', adminMiddleware, getFileAnalytics);

// Error handling middleware for multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                message: 'File too large', 
                maxSize: '50MB' 
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ 
                message: 'Too many files', 
                maxFiles: 5 
            });
        }
    }
    
    if (error.message.includes('Unsupported file type')) {
        return res.status(400).json({ 
            message: error.message,
            allowedTypes: ['PDF', 'JPG', 'PNG', 'DOC', 'DOCX', 'TXT', 'ZIP']
        });
    }
    
    next(error);
});

module.exports = router;