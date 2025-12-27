// routes/loginRoutes.js
const express = require("express");
const router = express.Router();
const employeeController = require("../controllers/employeeController");

// Route hiển thị trang đăng nhập
router.get("/login", employeeController.getLoginPage);

// Route để đăng nhập (xử lý POST)
router.post("/login", employeeController.login);

// Route để đăng xuất
router.get("/logout", employeeController.logout);

module.exports = router;
