const express = require('express');
const router = express.Router();
const changeruleController = require('../controllers/changeruleController');
const authorizeAdmin = require('../middleware/authAdminMiddleware');

// PATCH /api/change-rules (Dùng PATCH vì đây là cập nhật)
router.patch('/:tenThamSo', authorizeAdmin, changeruleController.updateRule); // <-- 2. THÊM ROUTE NÀY

module.exports = router;