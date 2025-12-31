const express = require("express");
const router = express.Router();
const bookController = require("../controllers/bookController");
const authorizeAdmin = require("../middleware/authAdminMiddleware");
const { checkPermission } = require("../middleware/permissionMiddleware");

// Đầu sách routes
router.get(
  "/getDauSach/:maDS",
  checkPermission("sach.xem", "admin.full"),
  bookController.getDauSachById
);
router.post(
  "/createDauSach",
  checkPermission("sach.them", "admin.full"),
  bookController.createDauSach
);
router.patch(
  "/updateDauSach/:maDS",
  checkPermission("sach.sua", "admin.full"),
  bookController.updateDauSach
);
router.delete(
  "/deleteDauSach/:maDS",
  checkPermission("sach.xoa", "admin.full"),
  bookController.deleteDauSach
);

// Sách routes
router.get(
  "/getSach/:maSach",
  checkPermission("sach.xem", "admin.full"),
  bookController.getSachById
);
router.post(
  "/createSach",
  checkPermission("sach.them", "admin.full"),
  bookController.createSach
);
router.patch(
  "/updateSach/:maSach",
  checkPermission("sach.sua", "admin.full"),
  bookController.updateSach
);
router.delete(
  "/deleteSach/:maSach",
  checkPermission("sach.xoa", "admin.full"),
  bookController.deleteSach
);

// Thể loại routes
router.post(
  "/types/create",
  checkPermission("sach.them", "admin.full"),
  bookController.createTheLoai
);
router.patch(
  "/types/update/:maTheLoai",
  checkPermission("sach.sua", "admin.full"),
  bookController.updateTheLoai
);
router.delete(
  "/types/delete/:maTheLoai",
  checkPermission("sach.xoa", "admin.full"),
  bookController.deleteTheLoai
);

// Tác giả routes
router.post(
  "/authors/create",
  checkPermission("sach.them", "admin.full"),
  bookController.createTacGia
);
router.patch(
  "/authors/update/:maTacGia",
  checkPermission("sach.sua", "admin.full"),
  bookController.updateTacGia
);
router.delete(
  "/authors/delete/:maTacGia",
  checkPermission("sach.xoa", "admin.full"),
  bookController.deleteTacGia
);

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
