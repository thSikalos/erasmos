const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getAttachments, deleteAttachment } = require('../controllers/attachmentController');

router.use(authMiddleware);

// Route για τη λήψη των αρχείων μιας αίτησης
router.get('/:applicationId', getAttachments);

// Route για τη διαγραφή ενός αρχείου
router.delete('/:id', deleteAttachment);

// (Το route για το upload θα το προσθέσουμε αμέσως μετά)

module.exports = router;