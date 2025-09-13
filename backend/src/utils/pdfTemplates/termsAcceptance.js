const BRAND_CONFIG = require('../brandConfig');

class TermsAcceptanceTemplate {
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
                'ΑΠΟΔΟΧΗ ΟΡΩΝ ΧΡΗΣΗΣ & ΠΡΟΣΤΑΣΙΑΣ ΔΕΔΟΜΕΝΩΝ', 
                null
            );

            // Platform subtitle
            doc.fontSize(14)
               .fillColor(colors.secondary)
               .text('Πλατφόρμα Έρασμος', 50, currentY, { align: 'center' });
            
            currentY += 40;

            // Acceptance Details Section
            doc.fontSize(12)
               .fillColor(colors.primary)
               .text('ΣΤΟΙΧΕΙΑ ΑΠΟΔΟΧΗΣ', 50, currentY, { underline: true });
            
            currentY += 25;

            // User details
            if (data.agreement.user_name) {
                doc.fontSize(11)
                   .fillColor(colors.dark)
                   .text(`Χρήστης: ${data.agreement.user_name}`, 50, currentY);
                currentY += 15;
            }

            if (data.agreement.user_email) {
                doc.fontSize(10)
                   .text(`Email: ${data.agreement.user_email}`, 50, currentY);
                currentY += 15;
            }

            if (data.agreement.accepted_at) {
                const acceptedDate = new Date(data.agreement.accepted_at);
                doc.fontSize(10)
                   .text(`Ημερομηνία Αποδοχής: ${acceptedDate.toLocaleString(locale.language)}`, 50, currentY);
                currentY += 15;
            }

            if (data.agreement.terms_version) {
                doc.fontSize(10)
                   .text(`Έκδοση Όρων: ${data.agreement.terms_version}`, 50, currentY);
                currentY += 15;
            }

            if (data.agreement.ip_address) {
                doc.fontSize(9)
                   .fillColor(colors.secondary)
                   .text(`IP Address: ${data.agreement.ip_address}`, 50, currentY);
                currentY += 15;
            }

            if (data.agreement.user_agent) {
                const userAgent = data.agreement.user_agent.length > 100 
                    ? data.agreement.user_agent.substring(0, 100) + '...'
                    : data.agreement.user_agent;
                doc.fontSize(8)
                   .text(`Browser: ${userAgent}`, 50, currentY);
                currentY += 15;
            }

            currentY += 20;

            // Terms Content Section
            doc.fontSize(12)
               .fillColor(colors.primary)
               .text('ΠΕΡΙΕΧΟΜΕΝΟ ΟΡΩΝ ΠΟΥ ΑΠΟΔΕΧΤΗΚΕ Ο ΧΡΗΣΤΗΣ', 50, currentY, { underline: true });
            
            currentY += 25;

            if (data.agreement.terms_title) {
                doc.fontSize(11)
                   .fillColor(colors.dark)
                   .text(`Τίτλος: ${data.agreement.terms_title}`, 50, currentY);
                currentY += 20;
            }

            // Terms content formatting
            if (data.agreement.terms_content) {
                currentY = this.addFormattedTermsContent(doc, data.agreement.terms_content, currentY);
            }

            // Legal footer
            currentY += 30;
            doc.fontSize(8)
               .fillColor(colors.secondary)
               .text('---', 50, currentY, { align: 'center' });
            
            currentY += 10;
            
            doc.text('Το παρόν έγγραφο αποτελεί αποδεικτικό αποδοχής των όρων χρήσης της πλατφόρμας Έρασμος.', 
                     50, currentY, { 
                         align: 'center',
                         width: 495
                     });
            
            // Add enterprise footer
            this.generator.addEnterpriseFooter(doc);

            return doc;

        } catch (error) {
            console.error('Error generating terms acceptance PDF:', error);
            throw error;
        }
    }

    addFormattedTermsContent(doc, content, startY) {
        const { colors } = this.brandConfig;
        let currentY = startY;
        const maxWidth = 495;
        const leftMargin = 50;

        // Split content into paragraphs and format
        const lines = content.split('\n');
        
        lines.forEach(line => {
            line = line.trim();
            
            if (line.length === 0) {
                currentY += 10;
                return;
            }

            // Check if we need a new page
            if (currentY > 700) {
                doc.addPage();
                currentY = 50;
            }

            if (line.match(/^\d+\./)) {
                // Section headers (numbered)
                currentY += 15;
                doc.fontSize(11)
                   .fillColor(colors.primary)
                   .text(line, leftMargin, currentY, { 
                       underline: true,
                       width: maxWidth
                   });
                currentY += 20;
            } else if (line.includes(':') && line.length < 100) {
                // Sub-headers
                doc.fontSize(10)
                   .fillColor(colors.dark)
                   .text(line, leftMargin, currentY, { 
                       width: maxWidth
                   });
                currentY += 15;
            } else if (line.startsWith('- ')) {
                // Bullet points
                doc.fontSize(9)
                   .fillColor(colors.dark)
                   .text(line, leftMargin + 20, currentY, { 
                       width: maxWidth - 20
                   });
                currentY += 12;
            } else {
                // Regular paragraphs
                const textHeight = doc.heightOfString(line, {
                    width: maxWidth,
                    align: 'justify'
                });

                doc.fontSize(9)
                   .fillColor(colors.dark)
                   .text(line, leftMargin, currentY, { 
                       align: 'justify',
                       width: maxWidth
                   });
                currentY += textHeight + 8;
            }
        });

        return currentY;
    }
}

module.exports = TermsAcceptanceTemplate;