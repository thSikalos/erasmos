const pool = require('../config/db');

// --- GET ALL PRODUCTS ---
const getAllProducts = async (req, res) => {
    try {
        const products = await pool.query(`
            SELECT p.id, p.name, p.default_commission, c.name as company_name 
            FROM products p
            JOIN companies c ON p.company_id = c.id
            ORDER BY c.name, p.name
        `);
        res.json(products.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- CREATE A NEW PRODUCT --- (Admin only)
const createProduct = async (req, res) => {
    const { name, company_id, default_commission } = req.body;
    try {
        const newProduct = await pool.query(
            "INSERT INTO products (name, company_id, default_commission) VALUES ($1, $2, $3) RETURNING *",
            [name, company_id, default_commission]
        );
        res.status(201).json(newProduct.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- GET ALL PRODUCTS FOR A SPECIFIC COMPANY --- (All users)
const getProductsByCompany = async (req, res) => {
    const { companyId } = req.params;
    try {
        const products = await pool.query("SELECT * FROM products WHERE company_id = $1 ORDER BY name", [companyId]);
        res.json(products.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

module.exports = {
    createProduct,
    getProductsByCompany,
    getAllProducts
};