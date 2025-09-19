class LegalComplianceExcelTemplate {
    constructor(documentGenerator) {
        this.documentGenerator = documentGenerator;
        this.brandConfig = documentGenerator.brandConfig;
    }

    async generate(legalData, options = {}) {
        const ExcelJS = require('exceljs');

        // Create new workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'ERASMOS Platform';
        workbook.lastModifiedBy = 'ERASMOS Backend System';
        workbook.created = new Date();
        workbook.modified = new Date();

        // Add worksheets
        this.addSummarySheet(workbook, legalData.stats);
        this.addAcceptancesSheet(workbook, legalData.acceptances);
        this.addLegalDocumentsSheet(workbook);
        this.addAuditTrailSheet(workbook, legalData.auditTrail || []);
        this.addUsersStatusSheet(workbook, legalData.usersStatus || []);

        return workbook;
    }

    addSummarySheet(workbook, stats) {
        const worksheet = workbook.addWorksheet('Summary', {
            tabColor: { argb: 'FF0066CC' }
        });

        // Header
        worksheet.mergeCells('A1:E1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = '⚖️ LEGAL COMPLIANCE SUMMARY';
        titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF1F2937' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };

        // Generation info
        worksheet.getCell('A3').value = 'Report Generated:';
        worksheet.getCell('B3').value = new Date().toLocaleString('el-GR', {
            timeZone: 'Europe/Athens',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }) + ' (Ώρα Ελλάδας)';
        worksheet.getCell('A4').value = 'Report Period:';
        worksheet.getCell('B4').value = `${stats.fromDate} - ${stats.toDate}`;

        // Statistics
        const statsData = [
            ['Metric', 'Count', 'Description'],
            ['Total Legal Acceptances', stats.totalAcceptances, 'Users who started legal acceptance process'],
            ['Completed & Verified', stats.completedAcceptances, 'Fully compliant users (email verified)'],
            ['Pending Email Verification', stats.pendingVerifications, 'Completed acceptance but email not verified'],
            ['Users Without Acceptance', stats.usersWithoutAcceptance, 'Users who never started legal process'],
            ['Incomplete Acceptances', stats.incompleteAcceptances, 'Started but not completed legal acceptance'],
            ['Compliance Rate', `${stats.complianceRate}%`, 'Percentage of users fully compliant']
        ];

        let currentRow = 6;
        statsData.forEach((row, index) => {
            row.forEach((cell, colIndex) => {
                const cellRef = worksheet.getCell(currentRow, colIndex + 1);
                cellRef.value = cell;

                if (index === 0) {
                    // Header row
                    cellRef.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                    cellRef.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
                } else {
                    // Data rows
                    cellRef.font = { name: 'Arial', size: 11 };
                    if (index % 2 === 0) {
                        cellRef.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
                    }
                }

                cellRef.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
            currentRow++;
        });

        // Auto-fit columns
        worksheet.columns = [
            { width: 25 },
            { width: 15 },
            { width: 40 }
        ];
    }

    addAcceptancesSheet(workbook, acceptances) {
        const worksheet = workbook.addWorksheet('Legal Acceptances', {
            tabColor: { argb: 'FF10B981' }
        });

        // Headers
        const headers = [
            'User Name', 'Email', 'Status', 'Acceptance Date', 'IP Address',
            'User Agent', 'Terms Accepted', 'DPA Accepted', 'Privacy Accepted',
            'Declarations Accepted', 'Email Verified', 'Email Verified Date',
            'Verification Code', 'Session ID', 'Is Valid'
        ];

        headers.forEach((header, index) => {
            const cell = worksheet.getCell(1, index + 1);
            cell.value = header;
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // Data rows
        acceptances.forEach((acceptance, rowIndex) => {
            const row = rowIndex + 2;
            const rowData = [
                acceptance.user_name,
                acceptance.user_email,
                acceptance.is_valid ? 'COMPLIANT' : acceptance.email_verified ? 'EMAIL VERIFIED' : 'PENDING',
                new Date(acceptance.acceptance_timestamp).toLocaleString('el-GR', {
                    timeZone: 'Europe/Athens',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                }) + ' (Ώρα Ελλάδας)',
                acceptance.ip_address,
                acceptance.user_agent,
                acceptance.terms_accepted ? 'YES' : 'NO',
                acceptance.dpa_accepted ? 'YES' : 'NO',
                acceptance.privacy_accepted ? 'YES' : 'NO',
                acceptance.declarations_accepted ? 'YES' : 'NO',
                acceptance.email_verified ? 'YES' : 'NO',
                acceptance.email_verified_at ? new Date(acceptance.email_verified_at).toLocaleString('el-GR', {
                    timeZone: 'Europe/Athens',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                }) + ' (Ώρα Ελλάδας)' : '',
                acceptance.verification_code || '',
                acceptance.session_id,
                acceptance.is_valid ? 'YES' : 'NO'
            ];

            rowData.forEach((data, colIndex) => {
                const cell = worksheet.getCell(row, colIndex + 1);
                cell.value = data;
                cell.font = { name: 'Arial', size: 10 };

                // Color coding for status
                if (colIndex === 2) { // Status column
                    if (data === 'COMPLIANT') {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
                        cell.font.color = { argb: 'FF065F46' };
                    } else if (data === 'EMAIL VERIFIED') {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
                        cell.font.color = { argb: 'FF92400E' };
                    } else {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
                        cell.font.color = { argb: 'FF991B1B' };
                    }
                }

                // Alternating row colors
                if (rowIndex % 2 === 0) {
                    if (colIndex !== 2) { // Don't override status colors
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
                    }
                }

                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });

        // Auto-fit columns
        worksheet.columns = [
            { width: 20 }, // User Name
            { width: 25 }, // Email
            { width: 15 }, // Status
            { width: 20 }, // Acceptance Date
            { width: 15 }, // IP Address
            { width: 30 }, // User Agent
            { width: 12 }, // Terms
            { width: 12 }, // DPA
            { width: 12 }, // Privacy
            { width: 12 }, // Declarations
            { width: 12 }, // Email Verified
            { width: 20 }, // Email Verified Date
            { width: 15 }, // Verification Code
            { width: 25 }, // Session ID
            { width: 10 }  // Is Valid
        ];
    }

    addAuditTrailSheet(workbook, auditTrail) {
        const worksheet = workbook.addWorksheet('Audit Trail', {
            tabColor: { argb: 'FF6366F1' }
        });

        // Headers
        const headers = [
            'Timestamp', 'User Email', 'Action Type', 'Description',
            'IP Address', 'User Agent', 'Legal Significance'
        ];

        headers.forEach((header, index) => {
            const cell = worksheet.getCell(1, index + 1);
            cell.value = header;
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // Data rows
        auditTrail.forEach((entry, rowIndex) => {
            const row = rowIndex + 2;
            const rowData = [
                new Date(entry.created_at).toLocaleString('el-GR', {
                    timeZone: 'Europe/Athens',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                }) + ' (Ώρα Ελλάδας)',
                entry.user_email || 'N/A',
                entry.action_type,
                entry.action_description,
                entry.ip_address,
                entry.user_agent,
                entry.is_legally_significant ? 'HIGH' : 'NORMAL'
            ];

            rowData.forEach((data, colIndex) => {
                const cell = worksheet.getCell(row, colIndex + 1);
                cell.value = data;
                cell.font = { name: 'Arial', size: 10 };

                // Highlight legally significant actions
                if (colIndex === 6 && data === 'HIGH') {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
                    cell.font.color = { argb: 'FF991B1B' };
                    cell.font.bold = true;
                }

                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });

        // Auto-fit columns
        worksheet.columns = [
            { width: 20 }, // Timestamp
            { width: 25 }, // User Email
            { width: 25 }, // Action Type
            { width: 40 }, // Description
            { width: 15 }, // IP Address
            { width: 30 }, // User Agent
            { width: 15 }  // Legal Significance
        ];
    }

    addUsersStatusSheet(workbook, usersStatus) {
        const worksheet = workbook.addWorksheet('Users Status', {
            tabColor: { argb: 'FFF59E0B' }
        });

        // Headers
        const headers = [
            'User ID', 'Name', 'Email', 'Legal Status', 'Registration Date',
            'Last Login', 'Legal Acceptance Count', 'Latest Acceptance Date',
            'Email Verification Status', 'Compliance Issues'
        ];

        headers.forEach((header, index) => {
            const cell = worksheet.getCell(1, index + 1);
            cell.value = header;
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // Data rows
        usersStatus.forEach((user, rowIndex) => {
            const row = rowIndex + 2;
            const rowData = [
                user.id,
                user.name,
                user.email,
                user.legal_status || 'NO ACCEPTANCE',
                new Date(user.created_at).toLocaleString('el-GR', {
                    timeZone: 'Europe/Athens',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                }) + ' (Ώρα Ελλάδας)',
                user.last_login ? new Date(user.last_login).toLocaleString('el-GR', {
                    timeZone: 'Europe/Athens',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                }) + ' (Ώρα Ελλάδας)' : 'Never',
                user.legal_acceptance_count || 0,
                user.latest_acceptance_date ? new Date(user.latest_acceptance_date).toLocaleString('el-GR', {
                    timeZone: 'Europe/Athens',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                }) + ' (Ώρα Ελλάδας)' : 'N/A',
                user.email_verification_status || 'NOT VERIFIED',
                user.compliance_issues || 'None'
            ];

            rowData.forEach((data, colIndex) => {
                const cell = worksheet.getCell(row, colIndex + 1);
                cell.value = data;
                cell.font = { name: 'Arial', size: 10 };

                // Color coding for legal status
                if (colIndex === 3) { // Legal Status column
                    if (data === 'COMPLIANT') {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
                        cell.font.color = { argb: 'FF065F46' };
                    } else if (data === 'PENDING VERIFICATION') {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
                        cell.font.color = { argb: 'FF92400E' };
                    } else {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
                        cell.font.color = { argb: 'FF991B1B' };
                    }
                }

                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });

        // Auto-fit columns
        worksheet.columns = [
            { width: 10 }, // User ID
            { width: 20 }, // Name
            { width: 25 }, // Email
            { width: 20 }, // Legal Status
            { width: 20 }, // Registration Date
            { width: 20 }, // Last Login
            { width: 15 }, // Acceptance Count
            { width: 20 }, // Latest Acceptance
            { width: 18 }, // Email Verification
            { width: 25 }  // Compliance Issues
        ];
    }

    addLegalDocumentsSheet(workbook) {
        const worksheet = workbook.addWorksheet('Legal Documents', {
            tabColor: { argb: 'FF8B5CF6' }
        });

        // Title
        worksheet.mergeCells('A1:C1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = '📜 LEGAL DOCUMENTS - FULL TEXT';
        titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF1F2937' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };

        let currentRow = 3;

        // Terms of Service
        worksheet.getCell(`A${currentRow}`).value = '1. ΌΡΟΙ ΧΡΉΣΗΣ ΠΛΑΤΦΌΡΜΑΣ ERASMOS';
        worksheet.getCell(`A${currentRow}`).font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1F2937' } };
        currentRow += 2;

        const termsText = this.getTermsOfServiceText();
        worksheet.getCell(`A${currentRow}`).value = termsText;
        worksheet.getCell(`A${currentRow}`).font = { name: 'Arial', size: 10 };
        worksheet.getCell(`A${currentRow}`).alignment = { wrapText: true, vertical: 'top' };
        worksheet.mergeCells(`A${currentRow}:C${currentRow + 15}`);
        currentRow += 20;

        // Data Processing Agreement
        worksheet.getCell(`A${currentRow}`).value = '2. ΣΥΜΦΩΝΙΑ ΕΠΕΞΕΡΓΑΣΙΑΣ ΔΕΔΟΜΕΝΩΝ (DPA)';
        worksheet.getCell(`A${currentRow}`).font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1F2937' } };
        currentRow += 2;

        const dpaText = this.getDataProcessingAgreementText();
        worksheet.getCell(`A${currentRow}`).value = dpaText;
        worksheet.getCell(`A${currentRow}`).font = { name: 'Arial', size: 10 };
        worksheet.getCell(`A${currentRow}`).alignment = { wrapText: true, vertical: 'top' };
        worksheet.mergeCells(`A${currentRow}:C${currentRow + 15}`);
        currentRow += 20;

        // Privacy Policy
        worksheet.getCell(`A${currentRow}`).value = '3. ΠΟΛΙΤΙΚΗ ΑΠΟΡΡΗΤΟΥ ERASMOS';
        worksheet.getCell(`A${currentRow}`).font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1F2937' } };
        currentRow += 2;

        const privacyText = this.getPrivacyPolicyText();
        worksheet.getCell(`A${currentRow}`).value = privacyText;
        worksheet.getCell(`A${currentRow}`).font = { name: 'Arial', size: 10 };
        worksheet.getCell(`A${currentRow}`).alignment = { wrapText: true, vertical: 'top' };
        worksheet.mergeCells(`A${currentRow}:C${currentRow + 15}`);

        // Auto-fit columns
        worksheet.columns = [
            { width: 80 }, // Main text column
            { width: 20 }, // Buffer
            { width: 20 }  // Buffer
        ];

        // Set row heights for text blocks
        for (let i = 5; i <= currentRow + 15; i++) {
            if (worksheet.getRow(i).values && worksheet.getRow(i).values.length > 0) {
                worksheet.getRow(i).height = 20;
            }
        }
    }

    getTermsOfServiceText() {
        return `ΌΡΟΙ ΧΡΉΣΗΣ ΠΛΑΤΦΌΡΜΑΣ ERASMOS

1. ΓΕΝΙΚΟΙ ΟΡΟΙ
Η πλατφόρμα ERASMOS παρέχει υπηρεσίες διαχείρισης και επεξεργασίας προσωπικών δεδομένων συμμορφούμενη πλήρως με τον Γενικό Κανονισμό Προστασίας Δεδομένων (GDPR) της Ευρωπαϊκής Ένωσης.

2. ΑΠΟΔΟΧΗ ΟΡΩΝ
Με τη χρήση της πλατφόρμας, συμφωνείτε πλήρως με τους παρόντες όρους χρήσης και δεσμεύεστε για την τήρησή τους.

3. ΥΠΟΧΡΕΩΣΕΙΣ ΧΡΗΣΤΗ
- Τήρηση της ισχύουσας νομοθεσίας περί προστασίας δεδομένων
- Διασφάλιση της νομιμότητας των δεδομένων που επεξεργάζεστε
- Λήψη της απαραίτητης συναίνεσης από τα υποκείμενα των δεδομένων

4. ΠΕΡΙΟΡΙΣΜΟΙ ΚΑΙ ΑΠΑΓΟΡΕΥΣΕΙΣ
Απαγορεύεται η χρήση της πλατφόρμας για παράνομες δραστηριότητες ή για επεξεργασία δεδομένων χωρίς νόμιμη βάση.

5. ΠΕΡΙΟΡΙΣΜΟΣ ΕΥΘΥΝΗΣ
Η εταιρεία περιορίζει την ευθύνη της στα όρια που προβλέπει ο νόμος για τις παρεχόμενες υπηρεσίες.`;
    }

    getDataProcessingAgreementText() {
        return `ΣΥΜΦΩΝΙΑ ΕΠΕΞΕΡΓΑΣΙΑΣ ΔΕΔΟΜΕΝΩΝ (DPA)

1. ΣΚΟΠΟΣ ΕΠΕΞΕΡΓΑΣΙΑΣ
Η επεξεργασία προσωπικών δεδομένων μέσω της πλατφόρμας ERASMOS γίνεται αποκλειστικά για τους σκοπούς που έχετε δηλώσει και συμφωνείτε.

2. ΚΑΤΗΓΟΡΙΕΣ ΔΕΔΟΜΕΝΩΝ
- Στοιχεία ταυτότητας και επικοινωνίας
- Επαγγελματικά δεδομένα
- Οικονομικά στοιχεία (κατά περίπτωση)

3. ΝΟΜΙΜΗ ΒΑΣΗ ΕΠΕΞΕΡΓΑΣΙΑΣ
Η επεξεργασία βασίζεται στη συναίνεση του υποκειμένου ή/και στη νόμιμη βάση που έχετε δηλώσει.

4. ΔΙΚΑΙΩΜΑΤΑ ΥΠΟΚΕΙΜΕΝΩΝ
Διασφαλίζουμε την τήρηση όλων των δικαιωμάτων των υποκειμένων των δεδομένων σύμφωνα με το GDPR.

5. ΜΕΤΡΑ ΑΣΦΑΛΕΙΑΣ
Εφαρμόζουμε κατάλληλα τεχνικά και οργανωτικά μέτρα για τη διασφάλιση της ασφάλειας των δεδομένων.

6. ΔΙΑΓΡΑΦΗ ΔΕΔΟΜΕΝΩΝ
Τα δεδομένα διαγράφονται μετά τη λήξη της περιόδου διατήρησης που έχετε ορίσει.

7. ΠΑΡΑΒΙΑΣΕΙΣ ΑΣΦΑΛΕΙΑΣ
Σε περίπτωση παραβίασης, ενημερώνουμε άμεσα τις αρμόδιες αρχές και τα υποκείμενα των δεδομένων.`;
    }

    getPrivacyPolicyText() {
        return `ΠΟΛΙΤΙΚΗ ΑΠΟΡΡΗΤΟΥ ERASMOS

1. ΣΥΛΛΟΓΗ ΔΕΔΟΜΕΝΩΝ
Συλλέγουμε μόνο τα απαραίτητα προσωπικά δεδομένα για την παροχή των υπηρεσιών μας.

2. ΧΡΗΣΗ ΔΕΔΟΜΕΝΩΝ
Τα δεδομένα χρησιμοποιούνται αποκλειστικά για:
- Παροχή υπηρεσιών πλατφόρμας
- Επικοινωνία με τους χρήστες
- Τήρηση νομικών υποχρεώσεων
- Βελτίωση υπηρεσιών

3. ΚΟΙΝΟΠΟΙΗΣΗ ΣΕ ΤΡΙΤΟΥΣ
Δεν κοινοποιούμε δεδομένα σε τρίτους χωρίς τη συναίνεσή σας, εκτός αν απαιτείται από το νόμο.

4. ΑΣΦΑΛΕΙΑ ΔΕΔΟΜΕΝΩΝ
Χρησιμοποιούμε σύγχρονες τεχνολογίες κρυπτογράφησης και ασφαλείας για την προστασία των δεδομένων.

5. ΔΙΚΑΙΩΜΑΤΑ ΧΡΗΣΤΩΝ
Έχετε δικαίωμα:
- Πρόσβασης στα δεδομένα σας
- Διόρθωσης ανακριβών στοιχείων
- Διαγραφής των δεδομένων σας
- Περιορισμού της επεξεργασίας
- Φορητότητας των δεδομένων
- Εναντίωσης στην επεξεργασία

6. COOKIES ΚΑΙ ΤΕΧΝΟΛΟΓΙΕΣ ΠΑΡΑΚΟΛΟΥΘΗΣΗΣ
Χρησιμοποιούμε cookies μόνο για τη βελτίωση της εμπειρίας χρήσης και την ασφάλεια της πλατφόρμας.

7. ΕΠΙΚΟΙΝΩΝΙΑ
Για οποιοδήποτε ερώτημα σχετικά με την προστασία δεδομένων, επικοινωνήστε μαζί μας στο privacy@erasmos.app.`;
    }
}

module.exports = LegalComplianceExcelTemplate;