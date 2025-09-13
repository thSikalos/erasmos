const BRAND_CONFIG = require('../brandConfig');

class RenewalsTemplate {
    constructor(documentGenerator) {
        this.generator = documentGenerator;
        this.brandConfig = BRAND_CONFIG;
    }

    async generate(data, options = {}) {
        const { workbook, worksheet } = this.generator.createExcelWorkbook('Ανανεώσεις');
        const { colors, locale, platform } = this.brandConfig;

        try {
            // Configure worksheet
            worksheet.views = [{ showGridLines: true }];
            
            // Add title row with platform branding
            const titleCols = Math.max(7, data.dynamicHeaders ? data.dynamicHeaders.length + 6 : 7);
            worksheet.mergeCells(`A1:${this.getColumnLetter(titleCols)}1`);
            const titleCell = worksheet.getCell('A1');
            titleCell.value = `${platform.name} - Ανανεώσεις Συμβολαίων`;
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

            // Add filter information if provided
            if (data.filters) {
                worksheet.mergeCells(`A2:${this.getColumnLetter(titleCols)}2`);
                const filterCell = worksheet.getCell('A2');
                let filterText = 'Φίλτρα: ';
                if (data.filters.startDate) filterText += `Από ${data.filters.startDate} `;
                if (data.filters.endDate) filterText += `Έως ${data.filters.endDate}`;
                
                filterCell.value = filterText;
                filterCell.font = { size: 10, italic: true };
                filterCell.alignment = { horizontal: 'center' };
            }

            // Add generation timestamp
            worksheet.mergeCells(`A3:${this.getColumnLetter(titleCols)}3`);
            const timestampCell = worksheet.getCell('A3');
            timestampCell.value = `Δημιουργήθηκε: ${new Date().toLocaleString(locale.language)}`;
            timestampCell.font = { size: 8, color: { argb: colors.secondary.replace('#', 'FF') } };
            timestampCell.alignment = { horizontal: 'right' };

            // Set up base columns
            const baseColumns = [
                { 
                    header: 'Πελάτης', 
                    key: 'customer_name', 
                    width: 25
                },
                { 
                    header: 'Τηλέφωνο', 
                    key: 'customer_phone', 
                    width: 15,
                    style: { alignment: { horizontal: 'center' } }
                },
                { 
                    header: 'Εταιρεία', 
                    key: 'company_name', 
                    width: 20
                },
                { 
                    header: 'Συνεργάτης', 
                    key: 'associate_name', 
                    width: 22
                },
                { 
                    header: 'Ημ/νία Λήξης', 
                    key: 'contract_end_date', 
                    width: 15,
                    style: { 
                        numFmt: 'dd/mm/yyyy',
                        alignment: { horizontal: 'center' }
                    }
                },
                { 
                    header: 'Ημέρες Έως Λήξη', 
                    key: 'days_until_expiry', 
                    width: 18,
                    style: { 
                        alignment: { horizontal: 'center' },
                        numFmt: '0'
                    }
                }
            ];

            // Add dynamic columns if provided
            let allColumns = [...baseColumns];
            if (data.dynamicHeaders && data.dynamicHeaders.length > 0) {
                const dynamicColumns = data.dynamicHeaders.map(header => ({
                    header: header,
                    key: header,
                    width: Math.min(Math.max(header.length + 2, 12), 25)
                }));
                allColumns = [...allColumns, ...dynamicColumns];
            }

            worksheet.columns = allColumns;

            // Apply headers at row 5
            const startRow = 5;
            const headerRow = worksheet.getRow(startRow);
            allColumns.forEach((col, index) => {
                const cell = headerRow.getCell(index + 1);
                cell.value = col.header;
            });

            // Apply enterprise styling to headers
            this.generator.applyEnterpriseExcelStyling(worksheet, startRow);

            // Add data rows with enhanced formatting
            const dataStartRow = startRow + 1;
            if (data.renewals && data.renewals.length > 0) {
                data.renewals.forEach((renewal, index) => {
                    const row = worksheet.getRow(dataStartRow + index);
                    
                    // Calculate days until expiry
                    const endDate = new Date(renewal.contract_end_date);
                    const today = new Date();
                    const daysUntilExpiry = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                    
                    // Prepare base row data
                    const baseRowData = [
                        '', // Empty cell for A column (Excel starts at A)
                        renewal.customer_name || '',
                        renewal.customer_phone || '',
                        renewal.company_name || '',
                        renewal.associate_name || '',
                        new Date(renewal.contract_end_date),
                        daysUntilExpiry
                    ];

                    // Add dynamic field values if they exist
                    if (data.dynamicHeaders && data.dynamicHeaders.length > 0) {
                        data.dynamicHeaders.forEach(header => {
                            baseRowData.push(renewal[header] || '');
                        });
                    }

                    row.values = baseRowData;

                    // Apply conditional formatting based on days until expiry
                    const daysCell = row.getCell(7); // Days until expiry column
                    if (daysUntilExpiry <= 0) {
                        // Expired - red background
                        daysCell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: colors.danger.replace('#', 'FF') + '40' }
                        };
                        daysCell.font = { bold: true, color: { argb: colors.danger.replace('#', 'FF') } };
                    } else if (daysUntilExpiry <= 30) {
                        // Expiring soon - yellow background
                        daysCell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: colors.warning.replace('#', 'FF') + '40' }
                        };
                        daysCell.font = { bold: true, color: { argb: colors.warning.replace('#', 'FF') } };
                    } else if (daysUntilExpiry <= 90) {
                        // Moderate priority - light green
                        daysCell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: colors.success.replace('#', 'FF') + '20' }
                        };
                    }

                    // Apply alternating row colors
                    if (index % 2 === 1) {
                        row.eachCell((cell, colNumber) => {
                            if (colNumber !== 7) { // Don't override conditional formatting on days column
                                cell.fill = {
                                    type: 'pattern',
                                    pattern: 'solid',
                                    fgColor: { argb: colors.light.replace('#', 'FF') + '40' }
                                };
                            }
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

            // Add summary/legend section
            const summaryStartRow = dataStartRow + (data.renewals?.length || 0) + 2;
            
            // Legend header
            worksheet.mergeCells(`A${summaryStartRow}:C${summaryStartRow}`);
            const legendHeaderCell = worksheet.getCell(`A${summaryStartRow}`);
            legendHeaderCell.value = 'ΥΠΟΜΝΗΜΑ ΧΡΩΜΑΤΩΝ';
            legendHeaderCell.font = { 
                size: 12, 
                bold: true, 
                color: { argb: colors.primary.replace('#', 'FF') }
            };
            legendHeaderCell.alignment = { horizontal: 'center' };

            // Legend items
            const legendItems = [
                { text: 'Ληγμένα (≤ 0 ημέρες)', color: colors.danger },
                { text: 'Λήγουν Σύντομα (≤ 30 ημέρες)', color: colors.warning },
                { text: 'Μέτρια Προτεραιότητα (≤ 90 ημέρες)', color: colors.success }
            ];

            legendItems.forEach((item, index) => {
                const legendRow = worksheet.getRow(summaryStartRow + 1 + index);
                const colorCell = legendRow.getCell(1);
                const textCell = legendRow.getCell(2);
                
                colorCell.value = '■';
                colorCell.font = { 
                    size: 14, 
                    color: { argb: item.color.replace('#', 'FF') }
                };
                
                textCell.value = item.text;
                textCell.font = { size: 10 };
            });

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
            console.error('Error generating renewals Excel:', error);
            throw error;
        }
    }

    // Helper method to convert column number to Excel letter
    getColumnLetter(columnNumber) {
        let result = '';
        while (columnNumber > 0) {
            columnNumber--;
            result = String.fromCharCode(65 + (columnNumber % 26)) + result;
            columnNumber = Math.floor(columnNumber / 26);
        }
        return result;
    }
}

module.exports = RenewalsTemplate;