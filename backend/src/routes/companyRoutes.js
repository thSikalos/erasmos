const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const { 
    createCompany,
    getAllCompanies,
    updateCompany,
    deleteCompany
} = require('../controllers/companyController');

// Route για όλους τους συνδεδεμένους χρήστες
router.get('/', authMiddleware, getAllCompanies);

// Routes μόνο για Admins
router.post('/', [authMiddleware, adminMiddleware], createCompany);
router.put('/:id', [authMiddleware, adminMiddleware], updateCompany);
router.delete('/:id', [authMiddleware, adminMiddleware], deleteCompany);

module.exports = router;