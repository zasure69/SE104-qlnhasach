const express = require("express");
const router = express.Router();
const customerController = require("../controllers/customerController");
const authorizeAdmin = require("../middleware/authAdminMiddleware");
const { checkPermission } = require("../middleware/permissionMiddleware");

// GET /api/customers/getCustomers
router.get(
  "/getCustomers",
  checkPermission("khachhang.xem", "admin.full"),
  customerController.getCustomers
);

// POST /api/customers/createCustomers
router.post(
  "/createCustomers",
  checkPermission("khachhang.them", "admin.full"),
  customerController.createCustomer
);

// PATCH /api/customers/updateCustomers/:maKH
router.patch(
  "/updateCustomers/:maKH",
  checkPermission("khachhang.sua", "admin.full"),
  customerController.updateCustomer
);

// DELETE /api/customers/deleteCustomers/:maKH (Soft Delete)
router.delete(
  "/deleteCustomers/:maKH",
  checkPermission("khachhang.xoa", "admin.full"),
  customerController.deleteCustomer
);

// === ADMIN ONLY: Quản lý dữ liệu đã xóa ===
router.get("/deleted", authorizeAdmin, customerController.getDeletedCustomers);
router.patch(
  "/restore/:maKH",
  authorizeAdmin,
  customerController.restoreCustomer
);
router.delete(
  "/hard-delete/:maKH",
  authorizeAdmin,
  customerController.hardDeleteCustomer
);

module.exports = router;
