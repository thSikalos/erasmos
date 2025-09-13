const BRAND_CONFIG = require('../brandConfig');

class InvoiceTemplate {
    constructor(documentGenerator) {
        this.generator = documentGenerator;
        this.brandConfig = BRAND_CONFIG;
    }

    async generate(data, issuerData, options = {}) {
        const doc = this.generator.createPDFDocument();
        const { colors, locale } = this.brandConfig;

        try {
            // Add header with modern styling
            let currentY = this.generator.addEnterpriseHeader(
                doc, 
                'ΤΙΜΟΛΟΓΙΟ ΠΑΡΟΧΗΣ ΥΠΗΡΕΣΙΩΝ', 
                data.invoice.id
            );

            // Add invoice dates
            doc.fontSize(12)
               .fillColor(colors.dark)
               .text(`Ημερομηνία Έκδοσης: ${new Date(data.invoice.created_at).toLocaleDateString(locale.language)}`, 50, currentY);
            
            currentY += 15;
            doc.text(`Περίοδος Χρέωσης: ${new Date(data.invoice.start_date).toLocaleDateString(locale.language)} - ${new Date(data.invoice.end_date).toLocaleDateString(locale.language)}`, 50, currentY);
            
            currentY += 40;

            // Add issuer details (service provider)
            currentY = this.generator.addIssuerDetails(doc, issuerData, currentY);

            // Add client details (team leader)
            doc.fontSize(12)
               .fillColor(colors.dark)
               .text('ΠΡΟΣ (Πελάτης):', 50, currentY, { underline: true });
            
            currentY += 20;

            if (data.invoice.team_leader_name) {
                doc.fontSize(11).text(data.invoice.team_leader_name, 50, currentY);
                currentY += 15;
            }

            if (data.invoice.team_leader_email) {
                doc.fontSize(10).text(`Email: ${data.invoice.team_leader_email}`, 50, currentY);
                currentY += 15;
            }

            if (data.invoice.team_leader_afm) {
                doc.fontSize(10).text(`ΑΦΜ: ${data.invoice.team_leader_afm}`, 50, currentY);
                currentY += 15;
            }

            currentY += 30;

            // Services section header
            doc.fontSize(14)
               .fillColor(colors.primary)
               .text('ΑΝΆΛΥΣΗ ΠΑΡΕΧΟΜΕΝΩΝ ΥΠΗΡΕΣΙΩΝ', 50, currentY, { underline: true });
            
            currentY += 30;

            // Services table
            currentY = this.addServicesTable(doc, data.invoice, currentY);

            // Financial summary
            currentY = this.addInvoiceFinancialSummary(doc, data.invoice, currentY);

            // Payment instructions if needed
            currentY += 30;
            doc.fontSize(10)
               .fillColor(colors.secondary)
               .text('Παρακαλούμε επικοινωνήστε μαζί μας για οδηγίες πληρωμής.', 50, currentY);

            // Add footer
            this.generator.addEnterpriseFooter(doc);

            return doc;

        } catch (error) {
            console.error('Error generating invoice PDF:', error);
            throw error;
        }
    }

    addServicesTable(doc, invoice, startY) {
        const { colors, locale } = this.brandConfig;
        let currentY = startY;

        // Calculate derived values for clarity
        const totalApplications = parseInt(invoice.application_count);
        const baseCharge = parseFloat(invoice.base_charge);
        const discountApplied = parseFloat(invoice.discount_applied || 0);
        const discountAmount = baseCharge * (discountApplied / 100);
        const unitPrice = totalApplications > 0 ? (baseCharge / totalApplications) : 0;

        // Table setup
        const headers = ['Περιγραφή Υπηρεσίας', 'Ποσότητα', 'Τιμή Μονάδας', 'Σύνολο'];
        const columnWidths = [250, 80, 100, 100];
        const tableWidth = columnWidths.reduce((sum, width) => sum + width, 0);
        const startX = 50;

        // Header background
        doc.rect(startX, currentY - 5, tableWidth, 25)
           .fill(colors.primary)
           .fillColor(colors.white);

        // Header text
        let x = startX;
        headers.forEach((header, index) => {
            doc.fontSize(10)
               .text(header, x + 5, currentY + 5, {
                   width: columnWidths[index] - 10,
                   align: 'center'
               });
            x += columnWidths[index];
        });

        currentY += 25;

        // Service row
        doc.fillColor(colors.dark);
        x = startX;

        // Row background
        doc.rect(startX, currentY - 2, tableWidth, 20)
           .fill(colors.light);

        const rowData = [
            'Υπηρεσίες Διαχείρισης Αιτήσεων',
            totalApplications.toString(),
            `${unitPrice.toFixed(2)} ${locale.currencySymbol}`,
            `${baseCharge.toFixed(2)} ${locale.currencySymbol}`
        ];

        rowData.forEach((data, colIndex) => {
            doc.fontSize(9)
               .fillColor(colors.dark)
               .text(data, x + 5, currentY + 3, {
                   width: columnWidths[colIndex] - 10,
                   align: colIndex === 0 ? 'left' : 'center'
               });
            x += columnWidths[colIndex];
        });

        currentY += 20;

        // Add discount row if applicable
        if (discountApplied > 0) {
            x = startX;
            doc.rect(startX, currentY - 2, tableWidth, 20)
               .fill(colors.warning + '20');

            const discountRowData = [
                `Έκπτωση Όγκου (${discountApplied}%)`,
                '-',
                '-',
                `-${discountAmount.toFixed(2)} ${locale.currencySymbol}`
            ];

            discountRowData.forEach((data, colIndex) => {
                doc.fontSize(9)
                   .fillColor(colors.warning)
                   .text(data, x + 5, currentY + 3, {
                       width: columnWidths[colIndex] - 10,
                       align: colIndex === 0 ? 'left' : 'center'
                   });
                x += columnWidths[colIndex];
            });

            currentY += 20;
        }

        // Table border
        doc.rect(startX, startY - 5, tableWidth, currentY - startY + 5)
           .stroke(colors.primary);

        return currentY + 20;
    }

    addInvoiceFinancialSummary(doc, invoice, startY) {
        const { colors, locale } = this.brandConfig;
        let currentY = startY + 20;

        // Summary box
        const boxWidth = 200;
        const boxHeight = parseFloat(invoice.vat_amount) > 0 ? 120 : 100;
        const boxX = 345; // Right aligned
        
        doc.rect(boxX, currentY, boxWidth, boxHeight)
           .stroke(colors.primary);

        // Summary title
        doc.fontSize(12)
           .fillColor(colors.primary)
           .text('Οικονομικά Στοιχεία', boxX + 10, currentY + 10, {
               width: boxWidth - 20,
               align: 'center'
           });

        currentY += 35;

        // Base amount (after discount)
        const subtotal = parseFloat(invoice.subtotal);
        doc.fontSize(10)
           .fillColor(colors.dark)
           .text('Καθαρό Ποσό:', boxX + 10, currentY)
           .text(`${subtotal.toFixed(2)} ${locale.currencySymbol}`, 
                 boxX + 10, currentY, { 
                     width: boxWidth - 20,
                     align: 'right' 
                 });

        currentY += 20;

        // VAT if applicable
        const vatAmount = parseFloat(invoice.vat_amount || 0);
        if (vatAmount > 0) {
            doc.text('ΦΠΑ (24%):', boxX + 10, currentY)
               .text(`${vatAmount.toFixed(2)} ${locale.currencySymbol}`, 
                     boxX + 10, currentY, { 
                         width: boxWidth - 20,
                         align: 'right' 
                     });
            currentY += 20;
        }

        // Separator line
        doc.moveTo(boxX + 10, currentY + 5)
           .lineTo(boxX + boxWidth - 10, currentY + 5)
           .stroke(colors.primary);

        currentY += 15;

        // Total amount
        const totalCharge = parseFloat(invoice.total_charge);
        doc.fontSize(12)
           .fillColor(colors.success)
           .text('ΣΥΝΟΛΙΚΗ ΧΡΕΩΣΗ:', boxX + 10, currentY, { 
               width: boxWidth - 20,
               align: 'left' 
           })
           .text(`${totalCharge.toFixed(2)} ${locale.currencySymbol}`, 
                 boxX + 10, currentY, { 
                     width: boxWidth - 20,
                     align: 'right' 
                 });

        // Add discount information box if applicable
        if (parseFloat(invoice.discount_applied || 0) > 0) {
            const infoBoxY = startY - 40;
            doc.rect(50, infoBoxY, 300, 25)
               .fill(colors.success + '20')
               .stroke(colors.success);

            doc.fontSize(9)
               .fillColor(colors.success)
               .text(`✓ Εφαρμόστηκε έκπτωση όγκου ${invoice.discount_applied}% για ${invoice.application_count} αιτήσεις`, 
                     55, infoBoxY + 8);
        }

        return currentY + 40;
    }
}

module.exports = InvoiceTemplate;