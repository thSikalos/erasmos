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
const termsRoutes = require('./routes/termsRoutes');

const app = express();
const PORT = 3000;
app.use(cors());
app.use(express.json());
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
app.use('/api/terms', termsRoutes);
app.use('/api/ai', aiRoutes);

app.listen(PORT, () => { console.log(`Server is running on http://localhost:${PORT}`); });