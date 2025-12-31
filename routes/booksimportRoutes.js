const express = require("express");
const router = express.Router();
const importController = require("../controllers/importController");
const authorizeAdmin = require("../middleware/authAdminMiddleware");
const { checkPermission } = require("../middleware/permissionMiddleware");

// CRUD routes cho Phiếu nhập sách
router.get(
  "/all",
  checkPermission("nhapsach.xem", "admin.full"),
  importController.getAllImportReceipts
);
router.get(
  "/:maPhieu",
  checkPermission("nhapsach.xem", "admin.full"),
  importController.getImportReceiptById
);
router.post(
  "/create",
  checkPermission("nhapsach.them", "admin.full"),
  importController.createImportReceipt
);
router.patch(
  "/update/:maPhieu",
  checkPermission("nhapsach.sua", "admin.full"),
  importController.updateImportReceipt
);
router.delete(
  "/delete/:maPhieu",
  checkPermission("nhapsach.xoa", "admin.full"),
  importController.deleteImportReceipt
);

// === ADMIN ONLY: Quản lý dữ liệu đã xóa ===
router.get(
  "/admin/deleted",
  authorizeAdmin,
  importController.getDeletedImportReceipts
);
router.patch(
  "/admin/restore/:maPhieu",
  authorizeAdmin,
  importController.restoreImportReceipt
);
router.delete(
  "/admin/hard-delete/:maPhieu",
  authorizeAdmin,
  importController.hardDeleteImportReceipt
);

module.exports = router;
