const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  getCustomerByAfm,
  updateCustomer,
  deleteCustomer,
  getCommunicationLog,
  addCommunicationLog,
  getDeletedCustomers,
  restoreCustomer,
  permanentDeleteCustomer,
  getCustomerApplications
} = require('../controllers/customerController');

// --- ADMIN ONLY ROUTES ---
router.get('/deleted', [authMiddleware, adminMiddleware], getDeletedCustomers);
router.patch('/:id/restore', [authMiddleware, adminMiddleware], restoreCustomer);
router.delete('/:id/permanent', [authMiddleware, adminMiddleware], permanentDeleteCustomer);

// --- AUTHENTICATED USER ROUTES (Τοποθετούνται μετά τα πιο ειδικά admin routes) ---
router.use(authMiddleware);
router.post('/', createCustomer);
router.get('/', getAllCustomers);
router.get('/afm/:afm', getCustomerByAfm);
router.get('/:id', getCustomerById);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer); // Αυτό είναι το soft delete
router.get('/:id/communications', getCommunicationLog);
router.post('/:id/communications', addCommunicationLog);
router.get('/:id/applications', getCustomerApplications);

module.exports = router;