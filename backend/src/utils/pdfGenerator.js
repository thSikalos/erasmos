const fs = require('fs');
const path = require('path');
const htmlPdf = require('html-pdf-node');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
const termsDir = path.join(uploadsDir, 'terms');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(termsDir)) {
    fs.mkdirSync(termsDir, { recursive: true });
}

// Convert markdown to HTML
const markdownToHtml = (markdownContent, title, version, effectiveDate) => {
    // Simple markdown to HTML conversion
    let html = markdownContent
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^\*\*(.*?)\*\*/gm, '<strong>$1</strong>')
        .replace(/^\*(.*?)$/gm, '<li>$1</li>')
        .replace(/^- (.*?)$/gm, '<li>$1</li>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
    
    // Wrap list items in ul tags
    html = html.replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>');
    
    // Wrap content in paragraphs
    html = '<p>' + html + '</p>';
    
    return `
<!DOCTYPE html>
<html lang="el">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: white;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #667eea;
        }
        
        .header h1 {
            color: #667eea;
            font-size: 28px;
            margin: 0 0 10px 0;
        }
        
        .version-info {
            color: #666;
            font-size: 14px;
        }
        
        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
            text-align: center;
        }
        
        h1 {
            color: #333;
            font-size: 24px;
            margin: 30px 0 15px 0;
            page-break-after: avoid;
        }
        
        h2 {
            color: #333;
            font-size: 18px;
            margin: 25px 0 12px 0;
            page-break-after: avoid;
        }
        
        h3 {
            color: #333;
            font-size: 16px;
            margin: 20px 0 10px 0;
            page-break-after: avoid;
        }
        
        p {
            margin: 12px 0;
            text-align: justify;
        }
        
        ul {
            margin: 15px 0;
            padding-left: 25px;
        }
        
        li {
            margin: 8px 0;
        }
        
        strong {
            color: #333;
            font-weight: 600;
        }
        
        .page-break {
            page-break-before: always;
        }
        
        @media print {
            body {
                margin: 0;
                padding: 15px;
            }
            
            .header {
                margin-bottom: 30px;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${title}</h1>
        <div class="version-info">
            Έκδοση: ${version} | Ημερομηνία Ισχύος: ${new Date(effectiveDate).toLocaleDateString('el-GR')}
        </div>
    </div>
    
    <div class="content">
        ${html}
    </div>
    
    <div class="footer">
        <p>Αυτό το έγγραφο δημιουργήθηκε αυτόματα από την πλατφόρμα "Έρασμος" (erasmos.app)</p>
        <p>Ημερομηνία δημιουργίας PDF: ${new Date().toLocaleDateString('el-GR')} ${new Date().toLocaleTimeString('el-GR')}</p>
    </div>
</body>
</html>`;
};

// Generate PDF from terms data
const generateTermsPdf = async (termsData) => {
    try {
        const { id, version, title, content, effective_date } = termsData;
        
        // Convert markdown content to HTML
        const htmlContent = markdownToHtml(content, title, version, effective_date);
        
        // PDF options
        const options = {
            format: 'A4',
            margin: {
                top: '1cm',
                right: '1cm',
                bottom: '1cm',
                left: '1cm'
            },
            printBackground: true,
            preferCSSPageSize: true
        };
        
        // Generate PDF buffer
        const file = { content: htmlContent };
        const pdfBuffer = await htmlPdf.generatePdf(file, options);
        
        // Create filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `terms_v${version}_${timestamp}.pdf`;
        const filePath = path.join(termsDir, filename);
        
        // Save PDF file
        fs.writeFileSync(filePath, pdfBuffer);
        
        return {
            filename,
            filePath,
            fileSize: pdfBuffer.length,
            buffer: pdfBuffer
        };
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw new Error('Failed to generate PDF: ' + error.message);
    }
};

// Get existing PDF for terms version
const getTermsPdf = (termsId) => {
    // This would query the database for existing PDF
    // For now, return null if no PDF exists
    return null;
};

// Clean old PDF files (optional cleanup function)
const cleanupOldPdfs = async (daysOld = 90) => {
    try {
        const files = fs.readdirSync(termsDir);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        
        let deletedCount = 0;
        
        files.forEach(file => {
            const filePath = path.join(termsDir, file);
            const stats = fs.statSync(filePath);
            
            if (stats.mtime < cutoffDate) {
                fs.unlinkSync(filePath);
                deletedCount++;
            }
        });
        
        console.log(`Cleaned up ${deletedCount} old PDF files`);
        return deletedCount;
        
    } catch (error) {
        console.error('Error cleaning up PDFs:', error);
        return 0;
    }
};

module.exports = {
    generateTermsPdf,
    getTermsPdf,
    cleanupOldPdfs
};