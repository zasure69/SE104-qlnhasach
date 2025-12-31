// routes/billRoutes.js
const express = require("express");
const router = express.Router();
const billController = require("../controllers/billController");
const authorizeAdmin = require("../middleware/authAdminMiddleware");
const { checkPermission } = require("../middleware/permissionMiddleware");

// LAY THONG TIN (GET)
router.get(
  "/customer/:MaKH",
  checkPermission("hoadon.xem", "admin.full"),
  billController.getCustomerInfo
);
router.get(
  "/book/:MaSach",
  checkPermission("hoadon.xem", "admin.full"),
  billController.getBookInfo
);
router.get(
  "/detail/:MaHD",
  checkPermission("hoadon.xem", "admin.full"),
  billController.getDetail
);

// TAO HOA DON (POST)
router.post(
  "/create",
  checkPermission("hoadon.them", "admin.full"),
  billController.create
);

// CHINH SUA HOA DON (PUT)
router.put(
  "/:MaHD",
  checkPermission("hoadon.sua", "admin.full"),
  billController.updateBill
);

// XOA HOA DON (DELETE - SOFT)
router.delete(
  "/:MaHD",
  checkPermission("hoadon.xoa", "admin.full"),
  billController.deleteBill
);

// LAY HOA DON GAN NHAT
router.get("/lastMaHD", billController.getLastMaHD);

// === ADMIN ONLY: Quan ly du lieu da xoa ===
router.get("/admin/deleted", authorizeAdmin, billController.getDeletedBills);
router.patch(
  "/admin/restore/:MaHD",
  authorizeAdmin,
  billController.restoreBill
);
router.delete(
  "/admin/hard-delete/:MaHD",
  authorizeAdmin,
  billController.hardDeleteBill
);

module.exports = router;
