// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

// Route hiển thị trang đăng nhập
router.get("/login", userController.getLoginPage);

// Route để đăng nhập (xử lý POST)
router.post("/login", userController.login);
// Nếu dùng session
req.session.user = user;
return res.status(200).json({ message: "Đăng nhập thành công" });

// Route để đăng xuất
router.get("/logout", userController.logout);

module.exports = router;
