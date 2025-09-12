-- Enhanced File Attachments Migration
-- Προσθήκη νέων columns για complete file management

-- Προσθήκη νέων columns στον πίνακα attachments
ALTER TABLE attachments 
ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS file_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS cloud_url TEXT,
ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Άλλο',
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_compressed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP;

-- Ευρετήριο για γρήγορες αναζητήσεις
CREATE INDEX IF NOT EXISTS idx_attachments_application_id ON attachments(application_id);
CREATE INDEX IF NOT EXISTS idx_attachments_category ON attachments(category);
CREATE INDEX IF NOT EXISTS idx_attachments_file_type ON attachments(file_type);

-- Πίνακας για tracking file downloads (για analytics)
CREATE TABLE IF NOT EXISTS file_download_logs (
    id SERIAL PRIMARY KEY,
    attachment_id INTEGER NOT NULL REFERENCES attachments(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- Ευρετήριο για download logs
CREATE INDEX IF NOT EXISTS idx_download_logs_attachment_id ON file_download_logs(attachment_id);
CREATE INDEX IF NOT EXISTS idx_download_logs_user_id ON file_download_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_download_logs_downloaded_at ON file_download_logs(downloaded_at);

-- Πίνακας για file categories/types
CREATE TABLE IF NOT EXISTS file_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    allowed_extensions TEXT[], -- ['pdf', 'jpg', 'png']
    max_file_size BIGINT, -- σε bytes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Προσθήκη default categories
INSERT INTO file_categories (name, description, allowed_extensions, max_file_size) VALUES
('Ταυτότητα', 'Έγγραφα ταυτότητας (ΑΔΤ, Διαβατήριο)', ARRAY['pdf', 'jpg', 'jpeg', 'png'], 10485760), -- 10MB
('Εισόδημα', 'Φορολογικές δηλώσεις, βεβαιώσεις εισοδήματος', ARRAY['pdf', 'doc', 'docx'], 10485760),
('Συμβόλαιο', 'Συμβόλαια, συμφωνίες', ARRAY['pdf', 'doc', 'docx'], 20971520), -- 20MB
('Λοιπά Δικαιολογητικά', 'Άλλα επίσημα έγγραφα', ARRAY['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'], 15728640), -- 15MB
('Άλλο', 'Διάφορα αρχεία', ARRAY['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'txt', 'zip'], 25165824) -- 25MB
ON CONFLICT (name) DO NOTHING;

-- Update existing attachments με default values
UPDATE attachments 
SET 
    file_type = CASE 
        WHEN file_name ILIKE '%.pdf' THEN 'application/pdf'
        WHEN file_name ILIKE '%.jpg' OR file_name ILIKE '%.jpeg' THEN 'image/jpeg'  
        WHEN file_name ILIKE '%.png' THEN 'image/png'
        WHEN file_name ILIKE '%.doc' THEN 'application/msword'
        WHEN file_name ILIKE '%.docx' THEN 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ELSE 'application/octet-stream'
    END,
    category = 'Άλλο'
WHERE file_type IS NULL;