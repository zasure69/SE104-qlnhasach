const express = require("express");
const router = express.Router();
const bookController = require("../controllers/bookController");

// DAU SACH (Đầu sách)
router.get("/dausach", bookController.getAllDauSach);
router.post("/dausach", bookController.createDauSach);
router.patch("/dausach/:maDS", bookController.updateDauSach);
router.delete("/dausach/:maDS", bookController.deleteDauSach);

// SACH (bản sách cụ thể)
router.get("/", bookController.getAllSach);
router.post("/createBook", bookController.createSach);
router.patch("/updateBook/:maSach", bookController.updateSach);
router.delete("/deleteBook/:maSach", bookController.deleteSach);

module.exports = router;
