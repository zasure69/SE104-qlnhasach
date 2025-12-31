const express = require("express");
const router = express.Router();
const changeruleController = require("../controllers/changeruleController");
const authorizeAdmin = require("../middleware/authAdminMiddleware");
const { checkPermission } = require("../middleware/permissionMiddleware");

// PATCH /api/change-rules (Dùng PATCH vì đây là cập nhật)
router.patch(
  "/:tenThamSo",
  checkPermission("caidat.thamso", "admin.full"),
  changeruleController.updateRule
);

module.exports = router;
