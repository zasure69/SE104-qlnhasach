const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const authorizeAdmin = require('../middleware/authAdminMiddleware'); // Import bảo vệ cấp 2

// --- ĐẶT ROUTE ĐĂNG KÝ VÀO ĐÂY ---
// Route này sẽ tự động được bảo vệ bởi authenticateToken (trong index.js)
// VÀ được bảo vệ thêm bởi authorizeAdmin (ngay tại đây)
//
// /api/employees
router.get('/getEmployees', authorizeAdmin, employeeController.getEmployees);
router.post('/registerEmployee', authorizeAdmin, employeeController.registerEmployee);
router.patch('/updateEmployee/:maNV', authorizeAdmin, employeeController.updateEmployee);
router.delete('/deleteEmployee/:maNV', authorizeAdmin, employeeController.deleteEmployee);
router.get('/check-employee/:maNV', employeeController.checkEmployeeExists);

// === ADMIN ONLY: Quản lý dữ liệu đã xóa ===
router.get('/deleted', authorizeAdmin, employeeController.getDeletedEmployees);
router.patch('/restore/:maNV', authorizeAdmin, employeeController.restoreEmployee);
router.delete('/hard-delete/:maNV', authorizeAdmin, employeeController.hardDeleteEmployee);

module.exports = router;