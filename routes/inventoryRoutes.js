const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventoryController");
const authorizeAdmin = require("../middleware/authAdminMiddleware");

// CRUD routes cho Phiếu kiểm kê
router.get("/all", inventoryController.getAllInventoryReceipts);
router.get("/:maPhieu", inventoryController.getInventoryReceiptById);
router.post("/create", inventoryController.createInventoryReceipt);
router.patch("/update/:maPhieu", inventoryController.updateInventoryReceipt);
router.delete("/delete/:maPhieu", inventoryController.deleteInventoryReceipt);

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
