const express = require("express");
const router = express.Router();
const bookController = require("../controllers/bookController");

// GET page (nếu cần render từ route này)
// router.get("/", bookController.getBooksPage);

// Đầu sách routes
router.post("/createDauSach", bookController.createDauSach);
router.patch("/updateDauSach/:maDS", bookController.updateDauSach);
router.delete("/deleteDauSach/:maDS", bookController.deleteDauSach);
router.get("/dauSach", bookController.getAllDauSach);
router.get("/getDauSach/:maDS", bookController.getDauSachById);

// Sách routes
router.post("/createSach", bookController.createSach);
router.patch("/updateSach/:maSach", bookController.updateSach);
router.delete("/deleteSach/:maSach", bookController.deleteSach);
router.get("/sach", bookController.getAllSach);

// Thể loại routes
router.post("/types/create", bookController.createTheLoai);
router.patch("/types/update/:maTL", bookController.updateTheLoai);
router.delete("/types/delete/:maTL", bookController.deleteTheLoai);

// Tác giả routes
router.post("/authors/create", bookController.createTacGia);
router.patch("/authors/update/:maTG", bookController.updateTacGia);
router.delete("/authors/delete/:maTG", bookController.deleteTacGia);

module.exports = router;
