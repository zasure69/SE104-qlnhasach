// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Route hiển thị trang đăng nhập
router.get('/login', userController.getLoginPage);

// Route để đăng nhập
router.post('/api/login', userController.login);

// Route để đăng xuất
router.get('/api/logout', userController.logout);

module.exports = router;