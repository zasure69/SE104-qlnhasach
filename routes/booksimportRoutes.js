const express = require("express");
const router = express.Router();
const importController = require("../controllers/importController");

// CRUD routes cho Phiếu nhập sách
router.get("/all", importController.getAllImportReceipts);
router.get("/:maPhieu", importController.getImportReceiptById);
router.post("/create", importController.createImportReceipt);
router.patch("/update/:maPhieu", importController.updateImportReceipt);
router.delete("/delete/:maPhieu", importController.deleteImportReceipt);

module.exports = router;
