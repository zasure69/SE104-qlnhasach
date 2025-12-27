const express = require("express");
const router = express.Router();
const importController = require("../controllers/importController");
const authorizeAdmin = require("../middleware/authAdminMiddleware");

// CRUD routes cho Phiếu nhập sách
router.get("/all", importController.getAllImportReceipts);
router.get("/:maPhieu", importController.getImportReceiptById);
router.post("/create", importController.createImportReceipt);
router.patch("/update/:maPhieu", importController.updateImportReceipt);
router.delete("/delete/:maPhieu", importController.deleteImportReceipt);

// === ADMIN ONLY: Quản lý dữ liệu đã xóa ===
router.get("/admin/deleted", authorizeAdmin, importController.getDeletedImportReceipts);
router.patch("/admin/restore/:maPhieu", authorizeAdmin, importController.restoreImportReceipt);
router.delete("/admin/hard-delete/:maPhieu", authorizeAdmin, importController.hardDeleteImportReceipt);

module.exports = router;
