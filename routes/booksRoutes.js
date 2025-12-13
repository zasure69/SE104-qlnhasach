const express = require("express");
const router = express.Router();
const bookController = require("../controllers/bookController");

// Đầu sách routes
router.get("/getDauSach/:maDS", bookController.getDauSachById);
router.post("/createDauSach", bookController.createDauSach);
router.patch("/updateDauSach/:maDS", bookController.updateDauSach);
router.delete("/deleteDauSach/:maDS", bookController.deleteDauSach);

// Sách routes
router.get("/getSach/:maSach", bookController.getSachById);
router.post("/createSach", bookController.createSach);
router.patch("/updateSach/:maSach", bookController.updateSach);
router.delete("/deleteSach/:maSach", bookController.deleteSach);

// Thể loại routes
router.post("/types/create", bookController.createTheLoai);
router.patch("/types/update/:maTheLoai", bookController.updateTheLoai);
router.delete("/types/delete/:maTheLoai", bookController.deleteTheLoai);

// Tác giả routes
router.post("/authors/create", bookController.createTacGia);
router.patch("/authors/update/:maTacGia", bookController.updateTacGia);
router.delete("/authors/delete/:maTacGia", bookController.deleteTacGia);

module.exports = router;
