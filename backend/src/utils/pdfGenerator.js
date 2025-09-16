const fs = require('fs');
const path = require('path');
const htmlPdf = require('html-pdf-node');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
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





module.exports = {
    markdownToHtml
};