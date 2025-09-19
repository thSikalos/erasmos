#!/usr/bin/env node

/**
 * Manual Test Script for Legal Email Verification
 * Simulates the exact email sending process from the legal compliance system
 */

require('dotenv').config();
const EmailService = require('./src/services/emailService');
const { v4: uuidv4 } = require('uuid');

// Test configuration
const TEST_CONFIG = {
    // Change this to your email for testing
    testEmail: 'thsikalos@gmail.com',
    // Try with your actual email as sender (more likely to be verified)
    testSender: 'thsikalos@gmail.com',
    acceptanceId: 'TEST_' + uuidv4(),
    verificationToken: uuidv4()
};

async function testLegalEmail() {
    console.log('🧪 TESTING LEGAL EMAIL VERIFICATION');
    console.log('=====================================');
    console.log(`Test Email: ${TEST_CONFIG.testEmail}`);
    console.log(`Acceptance ID: ${TEST_CONFIG.acceptanceId}`);
    console.log(`Verification Token: ${TEST_CONFIG.verificationToken}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log('=====================================\n');

    // Check environment variables
    console.log('🔧 ENVIRONMENT CHECK:');
    console.log(`SENDGRID_API_KEY: ${process.env.SENDGRID_API_KEY ? '✅ Present' : '❌ Missing'}`);
    console.log(`EMAIL_FROM: ${process.env.EMAIL_FROM || 'using default'}`);
    console.log(`FRONTEND_URL: ${process.env.FRONTEND_URL || 'using default'}`);
    console.log('');

    try {
        // Create EmailService instance
        const emailService = new EmailService();

        console.log('📧 SENDING LEGAL VERIFICATION EMAIL...');
        console.log('');

        // Generate a verification code
        const verificationCode = emailService.generateVerificationCode();

        // Send the exact same email as the legal system
        // Use the corrected EMAIL_FROM from .env (now erasmos.app)
        const result = await emailService.sendLegalVerificationEmail(
            TEST_CONFIG.testEmail,
            verificationCode,
            TEST_CONFIG.acceptanceId
        );

        console.log(`🔑 Generated verification code: ${verificationCode}`);

        console.log('✅ EMAIL SEND RESULT:');
        console.log('======================');
        console.log(JSON.stringify(result, null, 2));
        console.log('');

        if (result.success) {
            console.log('🎉 EMAIL SENT SUCCESSFULLY!');
            console.log('');
            console.log('📋 NEXT STEPS:');
            console.log('1. Check your inbox for the email');
            console.log('2. Check your spam/junk folder');
            console.log('3. Look for email from: ' + (process.env.EMAIL_FROM || 'no-reply@erasmos.app'));
            console.log('4. Subject should be: "🔒 Επιβεβαίωση Νομικής Αποδοχής - ERASMOS"');
            console.log('');
            console.log('💡 MANUAL VERIFICATION:');
            console.log(`Enter this code in the ERASMOS app: ${verificationCode}`);
        } else {
            console.log('❌ EMAIL SEND FAILED!');
            console.log('Error:', result.error);
        }

    } catch (error) {
        console.error('💥 SCRIPT ERROR:');
        console.error('================');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
    }

    console.log('\n🏁 TEST COMPLETED');
}

// Enhanced error handling
process.on('uncaughtException', (error) => {
    console.error('💥 UNCAUGHT EXCEPTION:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 UNHANDLED REJECTION at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run the test
testLegalEmail().catch(error => {
    console.error('💥 TEST FAILED:', error);
    process.exit(1);
});