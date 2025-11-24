const express = require("express");
const router = express.Router();
const searchController = require("../controllers/searchController");

// (File này sẽ được gắn sau 'authenticateToken' trong index.js)

// POST /api/search/customers
router.post("/customers", searchController.searchCustomers);

// POST /api/search/books
router.post("/books", searchController.searchBooks);

module.exports = router;
