const express = require("express");
const router = express.Router();
const bookController = require("../controllers/bookController");

// Đầu sách routes
router.post("/createDauSach", bookController.createDauSach);
router.patch("/updateDauSach/:maDS", bookController.updateDauSach);
router.delete("/deleteDauSach/:maDS", bookController.deleteDauSach);

// Sách routes
router.post("/createSach", bookController.createSach);
router.patch("/updateSach/:maSach", bookController.updateSach);
router.delete("/deleteSach/:maSach", bookController.deleteSach);

module.exports = router;
