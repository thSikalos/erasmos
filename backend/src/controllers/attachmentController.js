const pool = require('../config/db');
const AWS = require('aws-sdk');
const path = require('path');
const crypto = require('crypto');

// AWS S3 Configuration
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'eu-west-1'
});

// Generate unique filename
const generateFileName = (originalName) => {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(originalName);
    return `${timestamp}-${random}${ext}`;
};

// --- UPLOAD FILE ---
const uploadFile = async (req, res) => {
    try {
        console.log('Upload started, req.file:', req.file);
        console.log('Upload started, req.params:', req.params);
        
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { applicationId } = req.params;
        const userId = req.user.id;
        const file = req.file;

        console.log('Processing file:', file.originalname, 'Size:', file.size);

        // Check application status - only allow uploads if not "Καταχωρήθηκε"
        const statusQuery = `SELECT status FROM applications WHERE application_id = $1`;
        const statusResult = await pool.query(statusQuery, [applicationId]);

        if (statusResult.rows.length === 0) {
            return res.status(404).json({ message: 'Application not found' });
        }

        const applicationStatus = statusResult.rows[0].status;
        if (applicationStatus === 'Καταχωρήθηκε') {
            return res.status(403).json({
                message: 'Δεν επιτρέπεται η ανέβασμα αρχείων σε καταχωρημένες αιτήσεις',
                status: applicationStatus
            });
        }

        // Generate unique filename
        const fileName = generateFileName(file.originalname);
        const s3Key = `attachments/${applicationId}/${fileName}`;

        console.log('Uploading to S3, key:', s3Key);

        // Upload to S3
        const uploadParams = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: s3Key,
            Body: file.buffer,
            ContentType: file.mimetype,
            ServerSideEncryption: 'AES256'
        };

        const s3Result = await s3.upload(uploadParams).promise();
        console.log('S3 upload successful:', s3Result.Location);

        // Save to database
        const dbQuery = `
            INSERT INTO attachments
            (application_id, user_id, file_name, file_path, cloud_url, file_size, file_type, category)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;
        
        console.log('Saving to database...');
        const dbResult = await pool.query(dbQuery, [
            applicationId,
            userId,
            file.originalname, // file_name
            s3Result.Location, // file_path
            s3Result.Location, // cloud_url
            file.size,         // file_size
            file.mimetype,     // file_type
            'Άλλο'            // category
        ]);

        console.log('Database save successful');

        res.status(201).json({
            message: 'File uploaded successfully',
            attachment: dbResult.rows[0]
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: 'Upload failed', error: error.message });
    }
};

// --- GET ATTACHMENTS ---
const getAttachments = async (req, res) => {
    try {
        const { applicationId } = req.params;
        
        const query = `
            SELECT id, file_name, file_path, file_size, file_type, category, created_at, cloud_url
            FROM attachments
            WHERE application_id = $1
            ORDER BY created_at DESC
        `;
        const result = await pool.query(query, [applicationId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- GET DOWNLOAD URL ---
const getDownloadUrl = async (req, res) => {
    try {
        const { id } = req.params;

        // Get attachment info
        const attachmentQuery = `SELECT cloud_url, file_name, file_path, application_id FROM attachments WHERE id = $1`;
        const attachmentResult = await pool.query(attachmentQuery, [id]);

        if (attachmentResult.rows.length === 0) {
            return res.status(404).json({ message: 'File not found' });
        }

        const attachment = attachmentResult.rows[0];

        // Check if file is stored in cloud or locally
        if (attachment.cloud_url) {
            // File is in cloud storage, extract S3 key from URL
            const urlParts = attachment.cloud_url.split('/');
            const bucketIndex = urlParts.findIndex(part => part.includes('s3'));
            const s3Key = urlParts.slice(bucketIndex + 1).join('/'); // Extract everything after bucket domain

            const signedUrl = s3.getSignedUrl('getObject', {
                Bucket: process.env.S3_BUCKET_NAME,
                Key: s3Key,
                Expires: 3600, // 1 hour
                ResponseContentDisposition: `attachment; filename="${attachment.file_name}"`
            });

            res.json({
                url: signedUrl,
                filename: attachment.file_name
            });
        } else if (attachment.file_path) {
            // File is stored locally, create local download URL
            const localUrl = `${req.protocol}://${req.get('host')}/api/attachments/file/${id}`;
            res.json({
                url: localUrl,
                filename: attachment.file_name
            });
        } else {
            return res.status(404).json({ message: 'File location not found' });
        }

    } catch (error) {
        console.error('Download URL error:', error);
        res.status(500).json({ message: 'Failed to generate download URL' });
    }
};

// --- GET PREVIEW URL ---
const getPreviewUrl = async (req, res) => {
    try {
        const { id } = req.params;

        // Get attachment info
        const attachmentQuery = `SELECT cloud_url, file_name, file_path, application_id FROM attachments WHERE id = $1`;
        const attachmentResult = await pool.query(attachmentQuery, [id]);

        if (attachmentResult.rows.length === 0) {
            return res.status(404).json({ message: 'File not found' });
        }

        const attachment = attachmentResult.rows[0];

        // Check if file is stored in cloud or locally
        if (attachment.cloud_url) {
            // File is in cloud storage, extract S3 key from URL
            const urlParts = attachment.cloud_url.split('/');
            const bucketIndex = urlParts.findIndex(part => part.includes('s3'));
            const s3Key = urlParts.slice(bucketIndex + 1).join('/'); // Extract everything after bucket domain

            const signedUrl = s3.getSignedUrl('getObject', {
                Bucket: process.env.S3_BUCKET_NAME,
                Key: s3Key,
                Expires: 3600 // 1 hour - NO ResponseContentDisposition for inline viewing
            });

            res.json({
                url: signedUrl,
                filename: attachment.file_name
            });
        } else if (attachment.file_path) {
            // File is stored locally, create local preview URL
            const localUrl = `${req.protocol}://${req.get('host')}/api/attachments/file/${id}`;
            res.json({
                url: localUrl,
                filename: attachment.file_name
            });
        } else {
            return res.status(404).json({ message: 'File location not found' });
        }

    } catch (error) {
        console.error('Preview URL error:', error);
        res.status(500).json({ message: 'Failed to generate preview URL' });
    }
};

// --- SERVE LOCAL FILE ---
const serveLocalFile = async (req, res) => {
    try {
        const { id } = req.params;

        // Get attachment info
        const attachmentQuery = `SELECT file_path, file_name, file_type FROM attachments WHERE id = $1`;
        const attachmentResult = await pool.query(attachmentQuery, [id]);

        if (attachmentResult.rows.length === 0) {
            return res.status(404).json({ message: 'File not found' });
        }

        const attachment = attachmentResult.rows[0];

        if (!attachment.file_path) {
            return res.status(404).json({ message: 'File path not found' });
        }

        // Serve the file
        const fs = require('fs');
        const path = require('path');

        const filePath = path.resolve(attachment.file_path);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'Physical file not found' });
        }

        // Set appropriate headers
        res.setHeader('Content-Disposition', `attachment; filename="${attachment.file_name}"`);
        if (attachment.file_type) {
            res.setHeader('Content-Type', attachment.file_type);
        }

        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('Serve local file error:', error);
        res.status(500).json({ message: 'Failed to serve file' });
    }
};

// --- DELETE ATTACHMENT ---
const deleteAttachment = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        // Get attachment info
        const attachmentQuery = `SELECT * FROM attachments WHERE id = $1`;
        const attachmentResult = await pool.query(attachmentQuery, [id]);

        if (attachmentResult.rows.length === 0) {
            return res.status(404).json({ message: 'Attachment not found' });
        }

        const attachment = attachmentResult.rows[0];

        // Check application status - only allow deletes if not "Καταχωρήθηκε"
        const statusQuery = `SELECT status FROM applications WHERE application_id = $1`;
        const statusResult = await pool.query(statusQuery, [attachment.application_id]);

        if (statusResult.rows.length === 0) {
            return res.status(404).json({ message: 'Application not found' });
        }

        const applicationStatus = statusResult.rows[0].status;
        if (applicationStatus === 'Καταχωρήθηκε') {
            return res.status(403).json({
                message: 'Δεν επιτρέπεται η διαγραφή αρχείων από καταχωρημένες αιτήσεις',
                status: applicationStatus
            });
        }

        // Check permissions
        if (userRole !== 'Admin' && attachment.user_id !== userId) {
            return res.status(403).json({ message: 'Not authorized to delete this file' });
        }

        // Delete from S3 if cloud URL exists
        if (attachment.cloud_url) {
            // Extract S3 key from cloud URL
            const s3Key = `attachments/${attachment.application_id}/${attachment.file_name}`;
            await s3.deleteObject({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: s3Key
            }).promise();
        }

        // Delete from database
        await pool.query('DELETE FROM attachments WHERE id = $1', [id]);

        res.json({ message: 'File deleted successfully' });

    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ message: 'Failed to delete file' });
    }
};

// --- GET FILE CATEGORIES ---
const getFileCategories = async (req, res) => {
    try {
        const categories = [
            {
                name: 'document',
                description: 'Έγγραφα',
                allowed_extensions: ['pdf', 'doc', 'docx', 'txt'],
                max_file_size: 10485760 // 10MB
            },
            {
                name: 'image',
                description: 'Εικόνες',
                allowed_extensions: ['jpg', 'jpeg', 'png'],
                max_file_size: 5242880 // 5MB
            }
        ];
        res.json(categories);
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ message: 'Failed to get file categories' });
    }
};

// --- ADMIN: GET FILE ANALYTICS ---
const getFileAnalytics = async (req, res) => {
    try {
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const analytics = {
            total_files: 0,
            total_size: 0,
            files_by_type: {}
        };

        res.json(analytics);
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ message: 'Failed to get analytics' });
    }
};

// --- UPLOAD ATTACHMENTS TO S3 (for application creation) ---
const uploadAttachmentsToS3 = async (applicationId, attachments, userId) => {
    const uploadPromises = attachments.map(async (fileInfo) => {
        try {
            // Convert file data back to buffer if needed
            let fileBuffer;
            if (fileInfo.file instanceof File) {
                // In case we get a File object, convert to buffer
                fileBuffer = Buffer.from(await fileInfo.file.arrayBuffer());
            } else if (Buffer.isBuffer(fileInfo.file)) {
                fileBuffer = fileInfo.file;
            } else {
                throw new Error('Invalid file format');
            }

            // Generate unique filename
            const fileName = generateFileName(fileInfo.name);
            const s3Key = `attachments/${applicationId}/${fileName}`;

            // Upload to S3
            const uploadParams = {
                Bucket: process.env.S3_BUCKET_NAME,
                Key: s3Key,
                Body: fileBuffer,
                ContentType: fileInfo.type,
                ServerSideEncryption: 'AES256'
            };

            const s3Result = await s3.upload(uploadParams).promise();

            // Save to database
            const dbQuery = `
                INSERT INTO attachments 
                (application_id, uploaded_by, filename, original_filename, file_path, s3_key, file_size, mime_type, file_category) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
                RETURNING *
            `;
            
            const dbResult = await pool.query(dbQuery, [
                applicationId,
                userId,
                fileName,
                fileInfo.name,
                s3Result.Location,
                s3Key,
                fileInfo.size,
                fileInfo.type,
                fileInfo.category || 'document'
            ]);

            return dbResult.rows[0];
        } catch (error) {
            console.error(`Error uploading file ${fileInfo.name}:`, error);
            throw error;
        }
    });

    try {
        const results = await Promise.all(uploadPromises);
        return results;
    } catch (error) {
        console.error('Error uploading attachments:', error);
        throw error;
    }
};

module.exports = {
    uploadFile,
    getAttachments,
    getDownloadUrl,
    getPreviewUrl,
    serveLocalFile,
    deleteAttachment,
    getFileCategories,
    getFileAnalytics,
    uploadAttachmentsToS3
};