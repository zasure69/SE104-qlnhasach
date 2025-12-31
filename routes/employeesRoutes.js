const express = require("express");
const router = express.Router();
const employeeController = require("../controllers/employeeController");
const authorizeAdmin = require("../middleware/authAdminMiddleware"); // Import bảo vệ cấp 2
const { checkPermission } = require("../middleware/permissionMiddleware");

// --- ĐẶT ROUTE ĐĂNG KÝ VÀO ĐÂY ---
// Route này sẽ tự động được bảo vệ bởi authenticateToken (trong index.js)
// VÀ được bảo vệ thêm bởi checkPermission
//
// /api/employees
router.get(
  "/getEmployees",
  checkPermission("nhanvien.xem", "admin.full"),
  employeeController.getEmployees
);
router.post(
  "/registerEmployee",
  checkPermission("nhanvien.them", "admin.full"),
  employeeController.registerEmployee
);
router.patch(
  "/updateEmployee/:maNV",
  checkPermission("nhanvien.sua", "admin.full"),
  employeeController.updateEmployee
);
router.delete(
  "/deleteEmployee/:maNV",
  checkPermission("nhanvien.xoa", "admin.full"),
  employeeController.deleteEmployee
);
router.get("/check-employee/:maNV", employeeController.checkEmployeeExists);

// === ADMIN ONLY: Quản lý dữ liệu đã xóa ===
router.get("/deleted", authorizeAdmin, employeeController.getDeletedEmployees);
router.patch(
  "/restore/:maNV",
  authorizeAdmin,
  employeeController.restoreEmployee
);
router.delete(
  "/hard-delete/:maNV",
  authorizeAdmin,
  employeeController.hardDeleteEmployee
);

module.exports = router;
