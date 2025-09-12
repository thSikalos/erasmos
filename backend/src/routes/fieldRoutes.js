const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const { 
    createField, 
    getAllFields,
    updateField,
    deleteField 
} = require('../controllers/fieldController');

// Route for all authenticated users to see the available fields
router.get('/', authMiddleware, getAllFields);

// Routes only for Admins
router.post('/', [authMiddleware, adminMiddleware], createField);
router.put('/:id', [authMiddleware, adminMiddleware], updateField);
router.delete('/:id', [authMiddleware, adminMiddleware], deleteField);

module.exports = router;