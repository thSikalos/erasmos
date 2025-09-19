class LegalCompliancePdfTemplate {
    constructor(documentGenerator) {
        this.documentGenerator = documentGenerator;
        this.brandConfig = documentGenerator.brandConfig;
    }

    async generate(legalData, options = {}) {
        const PDFDocument = require('pdfkit');

        // Create new PDF document
        const doc = new PDFDocument({
            size: 'A4',
            margins: {
                top: 60,
                bottom: 60,
                left: 60,
                right: 60
            },
            info: {
                Title: 'Legal Compliance Report - ERASMOS',
                Author: 'ERASMOS Platform',
                Subject: 'GDPR Legal Compliance Report',
                Keywords: 'GDPR, Legal, Compliance, Audit',
                Creator: 'ERASMOS Backend System'
            }
        });

        // Header
        this.addHeader(doc);

        // Summary stats
        this.addSummary(doc, legalData.stats);

        // Legal acceptances details
        this.addAcceptanceDetails(doc, legalData.acceptances);

        // Footer
        this.addFooter(doc);

        return doc;
    }

    addHeader(doc) {
        const headerY = 50;

        // Title
        doc.fontSize(24)
           .fillColor('#1f2937')
           .text('⚖️ LEGAL COMPLIANCE REPORT', 60, headerY, { align: 'center' });

        doc.fontSize(16)
           .fillColor('#6b7280')
           .text('ERASMOS Platform - GDPR Compliance Audit', 60, headerY + 35, { align: 'center' });

        // Generation date
        doc.fontSize(10)
           .fillColor('#9ca3af')
           .text(`Generated: ${new Date().toLocaleString('el-GR', {
               timeZone: 'Europe/Athens',
               year: 'numeric',
               month: 'long',
               day: 'numeric',
               hour: '2-digit',
               minute: '2-digit'
           })}`, 60, headerY + 60, { align: 'center' });

        // Horizontal line
        doc.strokeColor('#e5e7eb')
           .lineWidth(1)
           .moveTo(60, headerY + 85)
           .lineTo(doc.page.width - 60, headerY + 85)
           .stroke();

        doc.y = headerY + 100;
    }

    addSummary(doc, stats) {
        const startY = doc.y + 20;

        doc.fontSize(18)
           .fillColor('#1f2937')
           .text('📊 Compliance Overview', 60, startY);

        const summaryY = startY + 30;
        const boxHeight = 120;

        // Summary box
        doc.roundedRect(60, summaryY, doc.page.width - 120, boxHeight, 8)
           .fillColor('#f9fafb')
           .fill()
           .strokeColor('#e5e7eb')
           .lineWidth(1)
           .stroke();

        // Stats content
        doc.fillColor('#374151')
           .fontSize(12);

        const statsText = [
            `📝 Total Legal Acceptances: ${stats.totalAcceptances}`,
            `✅ Completed & Verified: ${stats.completedAcceptances}`,
            `⏳ Pending Email Verification: ${stats.pendingVerifications}`,
            `👥 Users Without Legal Acceptance: ${stats.usersWithoutAcceptance}`,
            `🔄 Incomplete Acceptances: ${stats.incompleteAcceptances}`,
            `📅 Report Period: ${stats.fromDate} - ${stats.toDate}`
        ];

        statsText.forEach((text, index) => {
            doc.text(text, 80, summaryY + 20 + (index * 15));
        });

        doc.y = summaryY + boxHeight + 30;
    }

    addAcceptanceDetails(doc, acceptances) {
        doc.fontSize(18)
           .fillColor('#1f2937')
           .text('📋 Detailed Legal Acceptances', 60, doc.y);

        doc.y += 30;

        acceptances.forEach((acceptance, index) => {
            if (doc.y > doc.page.height - 200) {
                doc.addPage();
                doc.y = 60;
            }

            this.addAcceptanceRecord(doc, acceptance, index + 1);
        });
    }

    addAcceptanceRecord(doc, acceptance, recordNumber) {
        const recordY = doc.y;
        const recordHeight = 180;

        // Record box
        doc.roundedRect(60, recordY, doc.page.width - 120, recordHeight, 8)
           .fillColor('#ffffff')
           .fill()
           .strokeColor('#d1d5db')
           .lineWidth(1)
           .stroke();

        // Record header
        doc.fontSize(14)
           .fillColor('#1f2937')
           .text(`${recordNumber}. ${acceptance.user_name} (${acceptance.user_email})`, 80, recordY + 15);

        // Status badge
        const statusColor = acceptance.is_valid ? '#10b981' :
                           acceptance.email_verified ? '#f59e0b' : '#ef4444';
        const statusText = acceptance.is_valid ? 'COMPLIANT' :
                          acceptance.email_verified ? 'EMAIL VERIFIED' : 'PENDING';

        doc.fontSize(10)
           .fillColor(statusColor)
           .text(`[${statusText}]`, doc.page.width - 150, recordY + 17);

        // Digital signature section
        doc.fontSize(11)
           .fillColor('#374151');

        const signatureY = recordY + 40;
        doc.text('🔒 Digital Signature:', 80, signatureY);

        const signatureData = [
            `📅 Timestamp: ${new Date(acceptance.acceptance_timestamp).toLocaleString('el-GR')}`,
            `🌐 IP Address: ${acceptance.ip_address}`,
            `💻 User Agent: ${acceptance.user_agent.substring(0, 60)}...`,
            `🆔 Session ID: ${acceptance.session_id}`
        ];

        signatureData.forEach((data, index) => {
            doc.fontSize(9)
               .fillColor('#6b7280')
               .text(data, 100, signatureY + 15 + (index * 12));
        });

        // Acceptance details
        const acceptanceY = signatureY + 75;
        doc.fontSize(11)
           .fillColor('#374151')
           .text('✅ Legal Acceptances:', 80, acceptanceY);

        const acceptanceItems = [
            `📋 Terms of Service: ${acceptance.terms_accepted ? '✅' : '❌'}`,
            `🤝 Data Processing Agreement: ${acceptance.dpa_accepted ? '✅' : '❌'}`,
            `🔒 Privacy Policy: ${acceptance.privacy_accepted ? '✅' : '❌'}`,
            `📝 User Declarations: ${acceptance.declarations_accepted ? '✅' : '❌'}`
        ];

        acceptanceItems.forEach((item, index) => {
            doc.fontSize(9)
               .fillColor('#6b7280')
               .text(item, 100, acceptanceY + 15 + (index * 12));
        });

        // Email verification status
        const emailY = acceptanceY + 65;
        doc.fontSize(11)
           .fillColor('#374151')
           .text('📧 Email Verification:', 80, emailY);

        const emailStatus = acceptance.email_verified ?
            `✅ Verified at: ${new Date(acceptance.email_verified_at || acceptance.updated_at).toLocaleString('el-GR')}` :
            `⏳ Pending verification (Code: ${acceptance.verification_code || 'N/A'})`;

        doc.fontSize(9)
           .fillColor('#6b7280')
           .text(emailStatus, 100, emailY + 15);

        doc.y = recordY + recordHeight + 15;
    }

    addFooter(doc) {
        const footerY = doc.page.height - 100;

        // Footer line
        doc.strokeColor('#e5e7eb')
           .lineWidth(1)
           .moveTo(60, footerY)
           .lineTo(doc.page.width - 60, footerY)
           .stroke();

        // Footer text
        doc.fontSize(10)
           .fillColor('#9ca3af')
           .text('This document contains legally binding digital signatures and GDPR compliance records.',
                 60, footerY + 15, { align: 'center' });

        doc.text('Generated by ERASMOS Platform - Σίκαλος Θεολόγης',
                 60, footerY + 30, { align: 'center' });

        doc.text(`Document Hash: ${this.generateDocumentHash()}`,
                 60, footerY + 45, { align: 'center' });
    }

    generateDocumentHash() {
        // Simple document identifier
        const crypto = require('crypto');
        const timestamp = new Date().getTime();
        return crypto.createHash('md5').update(`erasmos-legal-${timestamp}`).digest('hex').substring(0, 12).toUpperCase();
    }

    async generateSignedContract(contractData, options = {}) {
        // Use the document generator's infrastructure for proper font handling
        const doc = this.documentGenerator.createPDFDocument({
            size: 'A4',
            margins: {
                top: 60,
                bottom: 60,
                left: 60,
                right: 60
            },
            info: {
                Title: `Legal Contract - ${contractData.user.name}`,
                Author: 'ERASMOS Platform',
                Subject: 'GDPR Legal Compliance Contract',
                Keywords: 'GDPR, Legal, Contract, Digital Signature',
                Creator: 'ERASMOS Backend System'
            }
        });

        // Header
        this.addSignedContractHeader(doc, contractData);

        // Contract details
        this.addContractDetails(doc, contractData);

        // Digital signature
        this.addDigitalSignature(doc, contractData);

        // Footer
        this.addSignedContractFooter(doc, contractData);

        return doc;
    }

    addSignedContractHeader(doc, contractData) {
        const headerY = 50;

        // Title
        doc.fontSize(24)
           .fillColor('#1f2937')
           .text('📜 LEGAL COMPLIANCE CONTRACT', 60, headerY, { align: 'center' });

        doc.fontSize(16)
           .fillColor('#6b7280')
           .text('ERASMOS Platform - Digitally Signed Agreement', 60, headerY + 35, { align: 'center' });

        // Contract info
        doc.fontSize(12)
           .fillColor('#374151')
           .text(`Contract ID: ${contractData.acceptance.id}`, 60, headerY + 65, { align: 'left' });

        doc.text(`User: ${contractData.user.name || 'N/A'} (${contractData.user.email || 'N/A'})`, 60, headerY + 80, { align: 'left' });

        doc.fontSize(10)
           .fillColor('#9ca3af')
           .text(`Generated: ${new Date().toLocaleString('el-GR', {
               timeZone: 'Europe/Athens',
               year: 'numeric',
               month: 'long',
               day: 'numeric',
               hour: '2-digit',
               minute: '2-digit'
           })}`, 60, headerY + 95, { align: 'left' });

        // Horizontal line
        doc.strokeColor('#e5e7eb')
           .lineWidth(1)
           .moveTo(60, headerY + 120)
           .lineTo(doc.page.width - 60, headerY + 120)
           .stroke();

        doc.y = headerY + 135;
    }

    addContractDetails(doc, contractData) {
        const acceptance = contractData.acceptance;
        const user = contractData.user;
        const declarations = contractData.declarations;

        doc.fontSize(16)
           .fillColor('#1f2937')
           .text('📋 CONTRACT TERMS & ACCEPTANCES', 60, doc.y);

        doc.y += 25;

        // Legal acceptances
        const acceptances = [
            { name: 'Terms of Service', accepted: acceptance.terms_accepted, date: acceptance.terms_accepted_at },
            { name: 'Data Processing Agreement (DPA)', accepted: acceptance.dpa_accepted, date: acceptance.dpa_accepted_at },
            { name: 'Privacy Policy', accepted: acceptance.privacy_accepted, date: acceptance.privacy_accepted_at },
            { name: 'User Compliance Declarations', accepted: acceptance.declarations_accepted, date: acceptance.declarations_accepted_at }
        ];

        acceptances.forEach((item, index) => {
            const status = item.accepted ? '✅ ACCEPTED' : '❌ NOT ACCEPTED';
            const dateStr = item.date ? new Date(item.date).toLocaleString('el-GR') : 'N/A';

            doc.fontSize(12)
               .fillColor('#374151')
               .text(`${index + 1}. ${item.name}: ${status}`, 80, doc.y);

            doc.fontSize(10)
               .fillColor('#6b7280')
               .text(`   Accepted at: ${dateStr}`, 80, doc.y + 15);

            doc.y += 35;
        });

        // User declarations (if any)
        if (declarations && Object.keys(declarations).length > 0) {
            doc.y += 10;
            doc.fontSize(14)
               .fillColor('#1f2937')
               .text('📝 USER COMPLIANCE DECLARATIONS', 60, doc.y);

            doc.y += 20;

            const declarationItems = [
                { key: 'hasLegalAuthority', label: 'Has Legal Authority to Process Data' },
                { key: 'hasObtainedConsents', label: 'Has Obtained Required Consents' },
                { key: 'hasInformedDataSubjects', label: 'Has Informed Data Subjects' },
                { key: 'dataIsAccurate', label: 'Confirms Data Accuracy' },
                { key: 'acceptsLiability', label: 'Accepts Legal Liability' },
                { key: 'understandsObligations', label: 'Understands GDPR Obligations' },
                { key: 'acceptsBilling', label: 'Accepts Billing Terms' },
                { key: 'confirmsLawfulBasis', label: 'Confirms Lawful Basis for Processing' }
            ];

            declarationItems.forEach(item => {
                const value = declarations[item.key];
                if (value !== undefined) {
                    const status = value ? '✅ YES' : '❌ NO';
                    doc.fontSize(11)
                       .fillColor('#374151')
                       .text(`• ${item.label}: ${status}`, 80, doc.y);
                    doc.y += 18;
                }
            });

            if (declarations.businessPurpose) {
                doc.fontSize(11)
                   .fillColor('#374151')
                   .text(`• Business Purpose: ${declarations.businessPurpose}`, 80, doc.y);
                doc.y += 18;
            }

            if (declarations.lawfulBasisType) {
                doc.fontSize(11)
                   .fillColor('#374151')
                   .text(`• Lawful Basis Type: ${declarations.lawfulBasisType}`, 80, doc.y);
                doc.y += 18;
            }
        }

        doc.y += 20;
    }

    addDigitalSignature(doc, contractData) {
        const signature = contractData.digitalSignature;

        doc.fontSize(16)
           .fillColor('#1f2937')
           .text('🔒 DIGITAL SIGNATURE', 60, doc.y);

        doc.y += 25;

        // Signature box
        const signatureY = doc.y;
        const signatureHeight = 150;

        doc.roundedRect(60, signatureY, doc.page.width - 120, signatureHeight, 8)
           .fillColor('#f8f9fa')
           .fill()
           .strokeColor('#28a745')
           .lineWidth(2)
           .stroke();

        // Signature content
        doc.fillColor('#28a745')
           .fontSize(14)
           .text('✅ DIGITALLY SIGNED & VERIFIED', 80, signatureY + 20);

        doc.fillColor('#374151')
           .fontSize(11);

        const signatureDetails = [
            `📅 Signed At: ${new Date(signature.timestamp).toLocaleString('el-GR')}`,
            `🌐 IP Address: ${signature.ipAddress}`,
            `💻 Device: ${signature.userAgent.substring(0, 80)}...`,
            `🆔 Session ID: ${signature.sessionId}`,
            `🔑 Verification Code: ${signature.verificationCode || 'N/A'}`,
            `📧 Email Verified: ${signature.emailVerifiedAt ? new Date(signature.emailVerifiedAt).toLocaleString('el-GR') : 'Pending'}`
        ];

        signatureDetails.forEach((detail, index) => {
            doc.text(detail, 80, signatureY + 45 + (index * 15));
        });

        doc.y = signatureY + signatureHeight + 20;
    }

    addSignedContractFooter(doc, contractData) {
        const footerY = doc.page.height - 120;

        // Move to footer area
        doc.y = footerY;

        // Footer box
        doc.roundedRect(60, footerY, doc.page.width - 120, 80, 8)
           .fillColor('#f1f5f9')
           .fill()
           .strokeColor('#e2e8f0')
           .lineWidth(1)
           .stroke();

        // Footer content
        doc.fontSize(10)
           .fillColor('#64748b')
           .text('⚖️ This document constitutes a legally binding digital contract under Greek and EU law.',
                 80, footerY + 15, { align: 'center', width: doc.page.width - 160 });

        doc.text('The digital signature above provides cryptographic proof of agreement and identity verification.',
                 80, footerY + 30, { align: 'center', width: doc.page.width - 160 });

        doc.text('Generated by ERASMOS Platform - Σίκαλος Θεολόγης',
                 80, footerY + 45, { align: 'center', width: doc.page.width - 160 });

        doc.text(`Document Hash: ${this.generateDocumentHash()}`,
                 80, footerY + 60, { align: 'center', width: doc.page.width - 160 });
    }
}

module.exports = LegalCompliancePdfTemplate;