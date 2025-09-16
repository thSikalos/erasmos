const { Pool } = require('pg');

// Δημιουργούμε ένα "pool" συνδέσεων.
// Αυτό διαχειρίζεται πολλές συνδέσεις ταυτόχρονα και είναι ο πιο αποδοτικός τρόπος.
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'postgres',
  password: process.env.DB_PASSWORD || 'mysecretpassword',
  port: process.env.DB_PORT || 5432,
});

module.exports = pool;