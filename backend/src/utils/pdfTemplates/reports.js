const BRAND_CONFIG = require('../brandConfig');

class ReportsTemplate {
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
                'ΑΝΑΛΥΤΙΚΗ ΑΝΑΦΟΡΑ'
            );

            // Add date information
            const now = new Date();
            doc.fontSize(12)
               .fillColor(colors.dark)
               .text(`Ημερομηνία Έκδοσης: ${now.toLocaleDateString(locale.language)}`, 50, currentY);

            currentY += 20;

            // Add filter information if available
            if (data.filters) {
                doc.fontSize(11)
                   .fillColor(colors.secondary)
                   .text('Φίλτρα Αναφοράς:', 50, currentY);
                currentY += 15;

                if (data.filters.startDate) {
                    doc.fontSize(10).text(`Από: ${data.filters.startDate}`, 60, currentY);
                    currentY += 12;
                }
                if (data.filters.endDate) {
                    doc.fontSize(10).text(`Έως: ${data.filters.endDate}`, 60, currentY);
                    currentY += 12;
                }
                if (data.filters.associateId) {
                    doc.fontSize(10).text(`Συνεργάτης: ${data.filters.associateId}`, 60, currentY);
                    currentY += 12;
                }
                if (data.filters.companyId) {
                    doc.fontSize(10).text(`Εταιρεία: ${data.filters.companyId}`, 60, currentY);
                    currentY += 12;
                }
                currentY += 10;
            }

            // Add issuer details
            currentY = this.generator.addIssuerDetails(doc, issuerData, currentY);

            // Summary Section
            if (data.summary) {
                doc.fontSize(14)
                   .fillColor(colors.primary)
                   .text('Συνοπτικά Στοιχεία:', 50, currentY, { underline: true });

                currentY += 25;

                // Summary stats
                doc.fontSize(12)
                   .fillColor(colors.dark)
                   .text(`Σύνολο Αιτήσεων: ${data.summary.total_applications}`, 50, currentY);
                currentY += 20;

                doc.fontSize(12)
                   .fillColor(colors.dark)
                   .text(`Συνολική Αμοιβή: ${parseFloat(data.summary.total_commission).toFixed(2)} ${locale.currencySymbol}`, 50, currentY);
                currentY += 30;
            }

            // Applications Table Header
            doc.fontSize(14)
               .fillColor(colors.primary)
               .text('Αναλυτικά Στοιχεία Αιτήσεων:', 50, currentY, { underline: true });

            currentY += 25;

            // Check if we have data to display
            if (data.details && data.details.length > 0) {
                currentY = this.addApplicationsTable(doc, data.details, currentY);
            } else {
                doc.fontSize(12)
                   .fillColor(colors.secondary)
                   .text('Δεν βρέθηκαν αιτήσεις με τα επιλεγμένα φίλτρα.', 50, currentY);
            }

            // Add footer
            this.generator.addEnterpriseFooter(doc);

            return doc;

        } catch (error) {
            console.error('Error generating reports PDF:', error);
            throw error;
        }
    }

    addApplicationsTable(doc, applications, startY) {
        const { colors, locale } = this.brandConfig;
        let currentY = startY;
        const pageHeight = doc.page.height;
        const margin = 50;
        const bottomMargin = 100; // Space for footer

        // Table configuration
        const headers = ['ID', 'Ημ/νία', 'Συνεργάτης', 'Πελάτης', 'Εταιρεία', 'Status', 'Αμοιβή'];
        const columnWidths = [40, 60, 80, 100, 80, 60, 70];
        const tableWidth = columnWidths.reduce((sum, width) => sum + width, 0);
        const startX = 50;
        const rowHeight = 18;

        // Helper function to add a new page if needed
        const checkNewPage = (nextRowY) => {
            if (nextRowY + bottomMargin > pageHeight) {
                doc.addPage();
                return margin; // Start from top of new page
            }
            return nextRowY;
        };

        // Draw table header
        currentY = checkNewPage(currentY + rowHeight);

        // Header background
        doc.rect(startX, currentY - 2, tableWidth, rowHeight)
           .fill(colors.primary);

        // Header text
        let x = startX;
        headers.forEach((header, index) => {
            doc.fontSize(9)
               .fillColor('white')
               .text(header, x + 2, currentY + 3, { width: columnWidths[index] - 4, align: 'center' });
            x += columnWidths[index];
        });

        currentY += rowHeight;

        // Draw table rows
        applications.forEach((app, rowIndex) => {
            currentY = checkNewPage(currentY + rowHeight);

            // Alternate row colors
            const fillColor = rowIndex % 2 === 0 ? colors.white : colors.light + '40';
            doc.rect(startX, currentY - 2, tableWidth, rowHeight)
               .fill(fillColor);

            // Row data
            x = startX;
            const rowData = [
                app.id.toString(),
                new Date(app.created_at).toLocaleDateString('el-GR'),
                app.associate_name || '',
                app.customer_name || '',
                app.company_name || '',
                app.status || '',
                `${parseFloat(app.total_commission || 0).toFixed(2)} €`
            ];

            rowData.forEach((cellData, colIndex) => {
                const align = colIndex === 0 || colIndex === 6 ? 'center' : 'left'; // Center ID and amount
                doc.fontSize(8)
                   .fillColor(colors.dark)
                   .text(cellData, x + 2, currentY + 2, {
                       width: columnWidths[colIndex] - 4,
                       align: align,
                       lineBreak: false
                   });
                x += columnWidths[colIndex];
            });

            currentY += rowHeight;
        });

        // Table border
        doc.rect(startX, startY, tableWidth, currentY - startY)
           .stroke(colors.dark);

        // Draw column separators
        x = startX;
        for (let i = 0; i < columnWidths.length - 1; i++) {
            x += columnWidths[i];
            doc.moveTo(x, startY)
               .lineTo(x, currentY)
               .stroke(colors.dark);
        }

        return currentY + 20;
    }
}

module.exports = ReportsTemplate;