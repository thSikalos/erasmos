const express = require('express');
const router = express.Router(); // Δημιουργούμε ένα Router, ένα "μίνι-app" για τα routes μας

// Ορίζουμε το route για την αρχική σελίδα πάνω σε αυτόν τον router
router.get('/', (req, res) => {
  res.send('Το API του "Έρασμος" είναι έτοιμο και οργανωμένο!');
});

// Εξάγουμε τον router για να τον χρησιμοποιήσουμε στην κυρίως εφαρμογή
module.exports = router;