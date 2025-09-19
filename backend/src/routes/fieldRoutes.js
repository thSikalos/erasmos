const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const {
    createField,
    getAllFields,
    updateField,
    deleteField,
    toggleFieldOptionActive,
    checkFieldOptionUsage,
    deleteFieldOption
} = require('../controllers/fieldController');

// Route for all authenticated users to see the available fields
router.get('/', authMiddleware, getAllFields);

// Routes only for Admins
router.post('/', [authMiddleware, adminMiddleware], createField);
router.put('/:id', [authMiddleware, adminMiddleware], updateField);
router.delete('/:id', [authMiddleware, adminMiddleware], deleteField);

// Field option management routes (Admin only)
router.patch('/options/:optionId/toggle-active', [authMiddleware, adminMiddleware], toggleFieldOptionActive);
router.get('/options/:optionId/usage', [authMiddleware, adminMiddleware], checkFieldOptionUsage);
router.delete('/options/:optionId', [authMiddleware, adminMiddleware], deleteFieldOption);

module.exports = router;