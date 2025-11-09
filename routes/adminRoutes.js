const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authorizeAdmin = require('../middleware/authAdminMiddleware'); // Import bảo vệ cấp 2

// --- ĐẶT ROUTE ĐĂNG KÝ VÀO ĐÂY ---
// Route này sẽ tự động được bảo vệ bởi authenticateToken (trong index.js)
// VÀ được bảo vệ thêm bởi authorizeAdmin (ngay tại đây)
//
// POST /api/admin/register
router.post('/register', authorizeAdmin, userController.register);

// (thêm các route admin khác ở đây)

module.exports = router;