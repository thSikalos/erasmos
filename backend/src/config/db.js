const { Pool } = require('pg');

// Δημιουργούμε ένα "pool" συνδέσεων.
// Αυτό διαχειρίζεται πολλές συνδέσεις ταυτόχρονα και είναι ο πιο αποδοτικός τρόπος.
const pool = new Pool({
  user: 'postgres', // Ο προεπιλεγμένος χρήστης της PostgreSQL
  host: 'localhost',
  database: 'postgres', // Η προεπιλεγμένη βάση που δημιουργείται
  password: 'mysecretpassword', // Ο κωδικός που ορίσαμε στο Docker
  port: 5432,
});

module.exports = pool;