// routes/dashboardRoutes.js
const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const bookController = require("../controllers/bookController");

// GET /dashboard/ -> Trang tổng quan
router.get("/", dashboardController.getDashboardPage);
router.get("/employees", dashboardController.getEmployeesPage);
router.get("/customers", dashboardController.getCustomersPage);
router.get("/search", dashboardController.getSearchPage);
router.get("/change-rule", dashboardController.getChangeRulePage);
// Render books management page
router.get("/books", bookController.getBooksPage);

module.exports = router;
