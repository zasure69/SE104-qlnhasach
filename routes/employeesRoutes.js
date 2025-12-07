const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authorizeAdmin = require('../middleware/authAdminMiddleware'); // Import bảo vệ cấp 2

// --- ĐẶT ROUTE ĐĂNG KÝ VÀO ĐÂY ---
// Route này sẽ tự động được bảo vệ bởi authenticateToken (trong index.js)
// VÀ được bảo vệ thêm bởi authorizeAdmin (ngay tại đây)
//
// /api/employees
router.get('/getEmployees', authorizeAdmin, userController.getEmployees);
router.post('/registerEmployee', authorizeAdmin, userController.registerEmployee);
router.patch('/updateEmployee/:maNV', authorizeAdmin, userController.updateEmployee);
router.delete('/deleteEmployee/:maNV', authorizeAdmin, userController.deleteEmployee);

// (thêm các route admin khác ở đây)

module.exports = router;