const express = require('express');
require('dotenv').config();
const pool = require('./config/db');
const cors = require('cors');
const path = require('path');

const mainRoutes = require('./routes/mainRoutes');
const userRoutes = require('./routes/userRoutes');
const customerRoutes = require('./routes/customerRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const aiRoutes = require('./routes/aiRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const companyRoutes = require('./routes/companyRoutes');
const fieldRoutes = require('./routes/fieldRoutes');
const bonusRoutes = require('./routes/bonusRoutes');
const commissionsRoutes = require('./routes/commissionsRoutes');
const reportsRoutes = require('./routes/reportsRoutes');
const notificationsRoutes = require('./routes/notificationsRoutes');
const remindersRoutes = require('./routes/remindersRoutes');
const attachmentRoutes = require('./routes/attachmentRoutes');
const adminBillingRoutes = require('./routes/adminBillingRoutes'); // <-- ΝΕΟ
const teamCompanyRoutes = require('./routes/teamCompanyRoutes');
const infoPortalRoutes = require('./routes/infoPortalRoutes');
const pdfTemplateRoutes = require('./routes/pdfTemplateRoutes');
const { pdfErrorHandler, pdfTimeout } = require('./middleware/pdfErrorHandler');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

// Add global request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    next();
});
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Debug middleware to log all requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    if (req.url.includes('renewals')) {
        console.log('RENEWALS REQUEST DETECTED:', req.method, req.url, req.query);
    }
    next();
});

pool.query('SELECT NOW()', (err, res) => { if(err) { console.error('Database connection error:', err.stack); } else { console.log('Successfully connected to the database.'); } });

app.use('/', mainRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/fields', fieldRoutes);
app.use('/api/bonuses', bonusRoutes);
app.use('/api/commissions', commissionsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/reminders', remindersRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/admin-billing', adminBillingRoutes); // <-- ΝΕΟ
app.use('/api/team-companies', teamCompanyRoutes);
app.use('/api/infoportal', infoPortalRoutes);
app.use('/api/pdf-templates', pdfTimeout(60000), pdfTemplateRoutes);
app.use('/api/ai', aiRoutes);

// Global error handler
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    console.error('Stack trace:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise);
    console.error('Reason:', reason);
});

// PDF-specific error handler (must come before general error handler)
app.use('/api/pdf-templates', pdfErrorHandler);
app.use('/api/applications/generate-pdf', pdfErrorHandler);
app.use('/api/applications/:id/upload-signed', pdfErrorHandler);

// Express error handler
app.use((error, req, res, next) => {
    console.error('Express error handler:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
});

app.listen(PORT, () => { console.log(`Server is running on http://localhost:${PORT}`); });