// routes/dashboardRoutes.js
const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const bookController = require("../controllers/bookController");
const importController = require("../controllers/importController");
const inventoryController = require("../controllers/inventoryController");
const reportRoutes = require("./reportRoutes");
const authorizeAdmin = require("../middleware/authAdminMiddleware");
const { checkPermission } = require("../middleware/permissionMiddleware");

// GET /dashboard/ -> Trang tổng quan
router.get("/", dashboardController.getDashboardPage);
router.get(
  "/employees",
  checkPermission("nhanvien.xem", "admin.full"),
  dashboardController.getEmployeesPage
);
router.get(
  "/customers",
  checkPermission("khachhang.xem", "admin.full"),
  dashboardController.getCustomersPage
);
router.get(
  "/change-rule",
  checkPermission("caidat.thamso", "admin.full"),
  dashboardController.getChangeRulePage
);
router.get(
  "/bills",
  checkPermission("hoadon.xem", "admin.full"),
  dashboardController.getBillsPage
);
router.get(
  "/receipts",
  checkPermission("phieuthu.xem", "admin.full"),
  dashboardController.getReceiptsPage
);
router.get(
  "/inventory",
  checkPermission("kiemke.xem", "admin.full"),
  inventoryController.getInventoryPage
);
//router.get('/reports', dashboardController.getReportPage);
router.use("/", reportRoutes);
// Render books management page
router.get(
  "/books",
  checkPermission("sach.xem", "admin.full"),
  bookController.getBooksPage
);
// Render import books page
router.get(
  "/books_import",
  checkPermission("nhapsach.xem", "admin.full"),
  importController.getImportPage
);

// ADMIN: Trang quản lý dữ liệu đã xóa (Thùng rác)
router.get("/trash", authorizeAdmin, dashboardController.getTrashPage);

module.exports = router;
