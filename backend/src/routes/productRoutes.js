const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const { 
    createProduct,
    getProductsByCompany,
    getAllProducts
} = require('../controllers/productController');

// Route ΜΟΝΟ για Admins για τη δημιουργία προϊόντος
router.post('/', [authMiddleware, adminMiddleware], createProduct);

// Route για να βλέπουν όλοι οι συνδεδεμένοι χρήστες τα προϊόντα
router.get('/', authMiddleware, getAllProducts);

// Route για να βλέπουν οι χρήστες τα προϊόντα μιας συγκεκριμένης εταιρείας
router.get('/by-company/:companyId', authMiddleware, getProductsByCompany);

module.exports = router;