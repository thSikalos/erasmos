const BRAND_CONFIG = require('../brandConfig');

class ReportsTemplate {
    constructor(documentGenerator) {
        this.generator = documentGenerator;
        this.brandConfig = BRAND_CONFIG;
    }

    async generate(data, options = {}) {
        const { workbook, worksheet } = this.generator.createExcelWorkbook('Αναλυτική Αναφορά');
        const { colors, locale, platform } = this.brandConfig;

        try {
            // Configure worksheet
            worksheet.views = [{ showGridLines: true }];
            
            // Add title row with platform branding
            worksheet.mergeCells('A1:G1');
            const titleCell = worksheet.getCell('A1');
            titleCell.value = `${platform.name} - Αναλυτική Αναφορά`;
            titleCell.font = { 
                size: 16, 
                bold: true, 
                color: { argb: colors.primary.replace('#', 'FF') }
            };
            titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
            titleCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: colors.light.replace('#', 'FF') }
            };

            // Add generation info
            if (data.filters) {
                worksheet.mergeCells('A2:G2');
                const filterCell = worksheet.getCell('A2');
                let filterText = 'Φίλτρα: ';
                if (data.filters.startDate) filterText += `Από ${data.filters.startDate} `;
                if (data.filters.endDate) filterText += `Έως ${data.filters.endDate} `;
                if (data.filters.associateId) filterText += `Συνεργάτης: ${data.filters.associateId} `;
                if (data.filters.companyId) filterText += `Εταιρεία: ${data.filters.companyId}`;
                
                filterCell.value = filterText;
                filterCell.font = { size: 10, italic: true };
                filterCell.alignment = { horizontal: 'center' };
            }

            // Add generation timestamp
            worksheet.mergeCells('A3:G3');
            const timestampCell = worksheet.getCell('A3');
            timestampCell.value = `Δημιουργήθηκε: ${new Date().toLocaleString(locale.language)}`;
            timestampCell.font = { size: 8, color: { argb: colors.secondary.replace('#', 'FF') } };
            timestampCell.alignment = { horizontal: 'right' };

            // Set up columns with enhanced formatting
            const startRow = 5;
            worksheet.columns = [
                { 
                    header: 'ID Αίτησης', 
                    key: 'id', 
                    width: 12,
                    style: { alignment: { horizontal: 'center' } }
                },
                { 
                    header: 'Ημερομηνία', 
                    key: 'created_at', 
                    width: 18,
                    style: { numFmt: 'dd/mm/yyyy hh:mm' }
                },
                { 
                    header: 'Συνεργάτης', 
                    key: 'associate_name', 
                    width: 25
                },
                { 
                    header: 'Πελάτης', 
                    key: 'customer_name', 
                    width: 30
                },
                { 
                    header: 'Εταιρεία', 
                    key: 'company_name', 
                    width: 22
                },
                { 
                    header: 'Κατάσταση', 
                    key: 'status', 
                    width: 18,
                    style: { alignment: { horizontal: 'center' } }
                },
                { 
                    header: `Αμοιβή (${locale.currencySymbol})`, 
                    key: 'total_commission', 
                    width: 15,
                    style: { 
                        numFmt: '#,##0.00',
                        alignment: { horizontal: 'right' }
                    }
                }
            ];

            // Move headers to the correct row
            const headerRow = worksheet.getRow(startRow);
            worksheet.columns.forEach((col, index) => {
                const cell = headerRow.getCell(index + 1);
                cell.value = col.header;
            });

            // Apply enterprise styling to headers
            this.generator.applyEnterpriseExcelStyling(worksheet, startRow);

            // Add data rows with enhanced formatting
            const dataStartRow = startRow + 1;
            if (data.details && data.details.length > 0) {
                data.details.forEach((record, index) => {
                    const row = worksheet.getRow(dataStartRow + index);
                    
                    // Format data
                    const formattedRecord = {
                        ...record,
                        created_at: new Date(record.created_at),
                        total_commission: parseFloat(record.total_commission || 0)
                    };

                    // Add data to row
                    row.values = [
                        '', // Empty cell for A column
                        formattedRecord.id,
                        formattedRecord.created_at,
                        formattedRecord.associate_name,
                        formattedRecord.customer_name,
                        formattedRecord.company_name,
                        formattedRecord.status,
                        formattedRecord.total_commission
                    ];

                    // Apply alternating row colors
                    if (index % 2 === 1) {
                        row.eachCell((cell) => {
                            cell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: colors.light.replace('#', 'FF') + '40' }
                            };
                        });
                    }

                    // Add borders to all cells
                    row.eachCell((cell) => {
                        cell.border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        };
                    });
                });
            }

            // Add summary section
            if (data.summary) {
                const summaryStartRow = dataStartRow + (data.details?.length || 0) + 2;
                
                // Summary header
                worksheet.mergeCells(`A${summaryStartRow}:G${summaryStartRow}`);
                const summaryHeaderCell = worksheet.getCell(`A${summaryStartRow}`);
                summaryHeaderCell.value = 'ΣΥΝΟΠΤΙΚΑ ΣΤΟΙΧΕΙΑ';
                summaryHeaderCell.font = { 
                    size: 14, 
                    bold: true, 
                    color: { argb: colors.primary.replace('#', 'FF') }
                };
                summaryHeaderCell.alignment = { horizontal: 'center' };
                summaryHeaderCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: colors.light.replace('#', 'FF') }
                };

                // Summary data
                const summaryRow1 = worksheet.getRow(summaryStartRow + 1);
                summaryRow1.values = [
                    '', 'Σύνολο Αιτήσεων:', data.summary.total_applications,
                    '', '', 'Συνολική Αμοιβή:', `${data.summary.total_commission.toFixed(2)} ${locale.currencySymbol}`
                ];

                // Style summary cells
                [2, 6].forEach(colIndex => {
                    const labelCell = summaryRow1.getCell(colIndex);
                    labelCell.font = { bold: true };
                    labelCell.alignment = { horizontal: 'right' };
                });

                [3, 7].forEach(colIndex => {
                    const valueCell = summaryRow1.getCell(colIndex);
                    valueCell.font = { bold: true, color: { argb: colors.success.replace('#', 'FF') } };
                });
            }

            // Freeze panes at header row
            worksheet.views = [{
                state: 'frozen',
                xSplit: 0,
                ySplit: startRow,
                topLeftCell: `A${startRow + 1}`,
                activeCell: 'A1'
            }];

            return workbook;

        } catch (error) {
            console.error('Error generating reports Excel:', error);
            throw error;
        }
    }
}

module.exports = ReportsTemplate;