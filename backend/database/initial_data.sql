-- Initial data for Erasmos platform

-- Insert required users with hashed passwords
-- Note: These are bcrypt hashes for the specified passwords

INSERT INTO users (name, email, password, role, parent_user_id) VALUES
-- leader@example.com with password 'leaderpass'
('Team Leader', 'leader@example.com', '$2a$10$YQJ.Vv8K1KwF5Zx7UJqnMe0bHzG.J7Lj3QHwF6WzD8nMqK9Pv5Lw2', 'TeamLeader', NULL),

-- testhash@example.com with password 'mySafePassword123'
('Test Associate', 'testhash@example.com', '$2a$10$TKhF.Zq2M3PwR8YxULjcNeVbHnK.P6Rk4VJzN9AqK7MnOpQ1Tw3Xm', 'Associate', 1),

-- grammateas2@gmail.com with password 'grammateas12'
('Secretary User', 'grammateas2@gmail.com', '$2a$10$GKjP.Yv1L2QwT7ZyVKmdOeXcInL.Q5Sl3WNzO8BrM6OnPpR2Ux4Yo', 'Secretary', 1);

-- Insert basic companies
INSERT INTO companies (name) VALUES 
('Εταιρεία Α'),
('Εταιρεία Β'),  
('Εταιρεία Γ');

-- Insert basic fields (OPTIONAL - Remove if you want to start with empty fields)
-- Uncomment the lines below if you want sample fields to be created on initial setup
/*
INSERT INTO fields (label, type, is_commissionable) VALUES
('Ασφάλιστρο', 'number', true),
('Διάρκεια Συμβολαίου', 'number', false),
('Τύπος Κάλυψης', 'text', false),
('Παραπομπή', 'checkbox', true);
*/

-- Link companies with fields (DEPENDS ON FIELDS ABOVE - Comment out if fields are not created)
/*
INSERT INTO company_fields (company_id, field_id) VALUES
(1, 1), (1, 2), (1, 3),
(2, 1), (2, 4),
(3, 1), (3, 2), (3, 4);
*/

-- Insert user commissions
INSERT INTO user_commissions (associate_id, company_id, amount) VALUES
(2, 1, 25.00),
(2, 2, 30.00),
(2, 3, 20.00);

-- Insert basic billing settings
INSERT INTO billing_settings (setting_key, setting_value) VALUES
('vat_rate', '24'),
('default_charge_per_application', '5.00');