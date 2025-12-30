const express = require("express");
const router = express.Router();
const bookController = require("../controllers/bookController");
const authorizeAdmin = require("../middleware/authAdminMiddleware");

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

// === ADMIN ONLY: Quản lý dữ liệu đã xóa ===
// Đầu sách
router.get(
  "/dausach/deleted",
  authorizeAdmin,
  bookController.getDeletedDauSach
);
router.patch(
  "/dausach/restore/:maDS",
  authorizeAdmin,
  bookController.restoreDauSach
);
router.delete(
  "/dausach/hard-delete/:maDS",
  authorizeAdmin,
  bookController.hardDeleteDauSach
);

// Sách
router.get("/sach/deleted", authorizeAdmin, bookController.getDeletedSach);
router.patch(
  "/sach/restore/:maSach",
  authorizeAdmin,
  bookController.restoreSach
);
router.delete(
  "/sach/hard-delete/:maSach",
  authorizeAdmin,
  bookController.hardDeleteSach
);

// Thể loại
router.get("/types/deleted", authorizeAdmin, bookController.getDeletedTheLoai);
router.patch(
  "/types/restore/:maTheLoai",
  authorizeAdmin,
  bookController.restoreTheLoai
);
router.delete(
  "/types/hard-delete/:maTheLoai",
  authorizeAdmin,
  bookController.hardDeleteTheLoai
);

// Tác giả
router.get("/authors/deleted", authorizeAdmin, bookController.getDeletedTacGia);
router.patch(
  "/authors/restore/:maTacGia",
  authorizeAdmin,
  bookController.restoreTacGia
);
router.delete(
  "/authors/hard-delete/:maTacGia",
  authorizeAdmin,
  bookController.hardDeleteTacGia
);

module.exports = router;
