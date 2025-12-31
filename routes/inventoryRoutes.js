const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventoryController");
const authorizeAdmin = require("../middleware/authAdminMiddleware");
const { checkPermission } = require("../middleware/permissionMiddleware");

// === API: Loại lý do kiểm kê ===
router.get(
  "/reasons",
  checkPermission("kiemke.xem", "admin.full"),
  inventoryController.getAllReasons
);
router.post(
  "/reasons",
  checkPermission("kiemke.them", "admin.full"),
  inventoryController.createReason
);
router.patch(
  "/reasons/:maLyDo",
  checkPermission("kiemke.sua", "admin.full"),
  inventoryController.updateReason
);
router.delete(
  "/reasons/:maLyDo",
  checkPermission("kiemke.xoa", "admin.full"),
  inventoryController.deleteReason
);

// CRUD routes cho Phiếu kiểm kê
router.get(
  "/all",
  checkPermission("kiemke.xem", "admin.full"),
  inventoryController.getAllInventoryReceipts
);
router.get(
  "/:maPhieu",
  checkPermission("kiemke.xem", "admin.full"),
  inventoryController.getInventoryReceiptById
);
router.post(
  "/create",
  checkPermission("kiemke.them", "admin.full"),
  inventoryController.createInventoryReceipt
);
router.patch(
  "/update/:maPhieu",
  checkPermission("kiemke.sua", "admin.full"),
  inventoryController.updateInventoryReceipt
);
router.delete(
  "/delete/:maPhieu",
  checkPermission("kiemke.xoa", "admin.full"),
  inventoryController.deleteInventoryReceipt
);

// === ADMIN ONLY: Quản lý dữ liệu đã xóa ===
router.get(
  "/admin/deleted",
  authorizeAdmin,
  inventoryController.getDeletedInventoryReceipts
);
router.patch(
  "/admin/restore/:maPhieu",
  authorizeAdmin,
  inventoryController.restoreInventoryReceipt
);
router.delete(
  "/admin/hard-delete/:maPhieu",
  authorizeAdmin,
  inventoryController.hardDeleteInventoryReceipt
);

module.exports = router;
