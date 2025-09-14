const BRAND_CONFIG = require('../brandConfig');

class PaymentStatementTemplate {
    constructor(documentGenerator) {
        this.generator = documentGenerator;
        this.brandConfig = BRAND_CONFIG;
    }

    async generate(data, issuerData, options = {}) {
        const doc = this.generator.createPDFDocument();
        const { colors, locale } = this.brandConfig;

        try {
            // Add header
            let currentY = this.generator.addEnterpriseHeader(
                doc, 
                'ΤΑΜΕΙΑΚΗ ΚΑΤΑΣΤΑΣΗ', 
                data.statement.id
            );

            // Add date information
            const createdAt = new Date(data.statement.created_at);
            doc.fontSize(12)
               .fillColor(colors.dark)
               .text(`Ημερομηνία Έκδοσης: ${createdAt.toLocaleDateString(locale.language)}`, 50, currentY);
            
            currentY += 30;

            // Add issuer details
            currentY = this.generator.addIssuerDetails(doc, issuerData, currentY);

            // Add recipient details
            doc.fontSize(12)
               .fillColor(colors.dark)
               .text('ΠΡΟΣ (Συνεργάτης):', 50, currentY, { underline: true });
            
            currentY += 20;

            if (data.statement.recipient_name) {
                doc.fontSize(11).text(data.statement.recipient_name, 50, currentY);
                currentY += 15;
            }

            if (data.statement.recipient_email) {
                doc.fontSize(10).text(`Email: ${data.statement.recipient_email}`, 50, currentY);
                currentY += 15;
            }

            if (data.statement.recipient_phone) {
                doc.fontSize(10).text(`Τηλέφωνο: ${data.statement.recipient_phone}`, 50, currentY);
                currentY += 15;
            }

            currentY += 20;

            // Commission Analysis Header
            doc.fontSize(14)
               .fillColor(colors.primary)
               .text('Ανάλυση Αμοιβών:', 50, currentY, { underline: true });
            
            currentY += 25;

            // Commission Items Table
            this.addCommissionTable(doc, data.items, currentY);
            
            // Calculate table height (rough estimation)
            const tableHeight = (data.items.length + 1) * 20 + 40;
            currentY += tableHeight;

            // Financial Summary
            currentY = this.addFinancialSummary(doc, data.statement, currentY);

            // Add footer
            this.generator.addEnterpriseFooter(doc);

            return doc;

        } catch (error) {
            console.error('Error generating payment statement PDF:', error);
            throw error;
        }
    }

    addCommissionTable(doc, items, startY) {
        const { colors } = this.brandConfig;
        let currentY = startY;

        // Get dynamic field label for header (if exists)
        const dynamicFieldLabel = items.length > 0 && items[0].dynamic_field_label
            ? items[0].dynamic_field_label
            : 'Αίτηση';

        // Table headers - include dynamic field column
        const headers = ['#', dynamicFieldLabel, 'Είδος', 'Εταιρία', 'Πελάτης', 'Αμοιβή'];
        const columnWidths = [25, 70, 70, 100, 150, 75];
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

        // Table rows
        doc.fillColor(colors.dark);
        items.forEach((item, index) => {
            x = startX;
            
            // Row background (alternating)
            if (index % 2 === 0) {
                doc.rect(startX, currentY - 2, tableWidth, 20)
                   .fill(colors.light);
            }

            // Row data
            const rowData = [
                (index + 1).toString(),
                item.dynamic_field_value || `#${item.application_id}`,
                item.item_type || 'Αίτηση',
                item.company_name || 'N/A',
                item.customer_name || 'N/A',
                `${parseFloat(item.commission_amount || 0).toFixed(2)} ${this.brandConfig.locale.currencySymbol}`
            ];

            rowData.forEach((data, colIndex) => {
                doc.fontSize(9)
                   .fillColor(colors.dark)
                   .text(data, x + 5, currentY + 3, {
                       width: columnWidths[colIndex] - 10,
                       align: colIndex === 4 ? 'right' : 'left'
                   });
                x += columnWidths[colIndex];
            });

            currentY += 20;
        });

        // Table border
        doc.rect(startX, startY - 5, tableWidth, (items.length + 1) * 20 + 15)
           .stroke(colors.primary);
    }

    addFinancialSummary(doc, statement, startY) {
        const { colors, locale } = this.brandConfig;
        let currentY = startY + 20;

        // Calculate if we need extra space for bonuses
        const hasBonus = statement.bonus_amount && parseFloat(statement.bonus_amount) > 0;
        const baseHeight = 100;
        const bonusHeight = hasBonus ? 45 : 0; // Extra space for bonus info
        const boxHeight = baseHeight + bonusHeight;

        // Summary box
        const boxWidth = 200;
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

        currentY += 30;

        // Commissions subtotal (excluding bonuses)
        const commissionsAmount = parseFloat(statement.subtotal || 0) - parseFloat(statement.bonus_amount || 0);
        doc.fontSize(10)
           .fillColor(colors.dark)
           .text('Αμοιβές:', boxX + 10, currentY)
           .text(`${commissionsAmount.toFixed(2)} ${locale.currencySymbol}`,
                 boxX + 10, currentY, {
                     width: boxWidth - 20,
                     align: 'right'
                 });

        currentY += 15;

        // Bonus section if applicable
        if (hasBonus) {
            doc.fontSize(10)
               .fillColor(colors.success)
               .text('Bonuses:', boxX + 10, currentY)
               .text(`${parseFloat(statement.bonus_amount).toFixed(2)} ${locale.currencySymbol}`,
                     boxX + 10, currentY, {
                         width: boxWidth - 20,
                         align: 'right'
                     });

            currentY += 12;

            // Bonus details if available
            if (statement.bonus_details) {
                doc.fontSize(8)
                   .fillColor(colors.dark)
                   .text(statement.bonus_details, boxX + 10, currentY, {
                       width: boxWidth - 20,
                       align: 'left'
                   });
                currentY += 18;
            } else {
                currentY += 3;
            }
        }

        // Subtotal line
        doc.fontSize(10)
           .fillColor(colors.dark)
           .text('Καθαρό Ποσό:', boxX + 10, currentY)
           .text(`${parseFloat(statement.subtotal || 0).toFixed(2)} ${locale.currencySymbol}`,
                 boxX + 10, currentY, {
                     width: boxWidth - 20,
                     align: 'right'
                 });

        currentY += 15;

        // VAT if applicable
        if (parseFloat(statement.vat_amount || 0) > 0) {
            doc.text('ΦΠΑ (24%):', boxX + 10, currentY)
               .text(`${parseFloat(statement.vat_amount).toFixed(2)} ${locale.currencySymbol}`,
                     boxX + 10, currentY, {
                         width: boxWidth - 20,
                         align: 'right'
                     });
            currentY += 15;
        }

        // Separator line
        doc.moveTo(boxX + 10, currentY + 5)
           .lineTo(boxX + boxWidth - 10, currentY + 5)
           .stroke(colors.primary);

        currentY += 15;

        // Total amount
        doc.fontSize(12)
           .fillColor(colors.success)
           .text('ΣΥΝΟΛΙΚΟ ΠΟΣΟ:', boxX + 10, currentY, {
               width: boxWidth - 20,
               align: 'left'
           })
           .text(`${parseFloat(statement.total_amount || 0).toFixed(2)} ${locale.currencySymbol}`,
                 boxX + 10, currentY, {
                     width: boxWidth - 20,
                     align: 'right'
                 });

        return currentY + 40;
    }
}

module.exports = PaymentStatementTemplate;