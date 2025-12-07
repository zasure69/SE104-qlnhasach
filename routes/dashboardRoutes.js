// routes/dashboardRoutes.js
const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const bookController = require("../controllers/bookController");
const importController = require("../controllers/importController");

// GET /dashboard/ -> Trang tổng quan
router.get('/', dashboardController.getDashboardPage);
router.get('/employees', dashboardController.getEmployeesPage);
router.get('/customers', dashboardController.getCustomersPage);
router.get('/search', dashboardController.getSearchPage);
router.get('/change-rule', dashboardController.getChangeRulePage);
router.get('/bills', dashboardController.getBillsPage);
router.get('/receipts', dashboardController.getReceiptsPage);
// Render books management page
router.get("/books", bookController.getBooksPage);
// Render import books page
router.get("/books_import", importController.getImportPage);

module.exports = router;
