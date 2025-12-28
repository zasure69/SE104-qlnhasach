// routes/dashboardRoutes.js
const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const bookController = require("../controllers/bookController");
const importController = require("../controllers/importController");
const inventoryController = require("../controllers/inventoryController");
const reportRoutes = require("./reportRoutes");
const authorizeAdmin = require("../middleware/authAdminMiddleware");

// GET /dashboard/ -> Trang tổng quan
router.get("/", dashboardController.getDashboardPage);
router.get("/employees", dashboardController.getEmployeesPage);
router.get("/customers", dashboardController.getCustomersPage);
router.get("/search", dashboardController.getSearchPage);
router.get("/change-rule", dashboardController.getChangeRulePage);
router.get("/bills", dashboardController.getBillsPage);
router.get("/receipts", dashboardController.getReceiptsPage);
router.get("/inventory", inventoryController.getInventoryPage);
//router.get('/reports', dashboardController.getReportPage);
router.use("/", reportRoutes);
// Render books management page
router.get("/books", bookController.getBooksPage);
// Render import books page
router.get("/books_import", importController.getImportPage);

// ADMIN: Trang quản lý dữ liệu đã xóa (Thùng rác)
router.get("/trash", authorizeAdmin, dashboardController.getTrashPage);

module.exports = router;
