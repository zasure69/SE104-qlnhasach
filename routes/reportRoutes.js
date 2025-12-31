//const express = require("express");
//const router = express.Router();
//const Report = require("../controllers/reportController");

//router.get("/", Report.RenderReportPage);
//router.get("/tonkho", Report.BaoCaoTon);
//router.get("/congno", Report.BaoCaoCongNo);
//router.get("/doanhthu", Report.BaoCaoDoanhThu);

//module.exports = router;
const express = require("express");
const router = express.Router();
const ReportController = require("../controllers/reportController"); // Đường dẫn tới file vừa sửa
const { checkPermission } = require("../middleware/permissionMiddleware");

// 1. Route hiển thị trang báo cáo (khi bấm vào menu)
router.get(
  "/reports",
  checkPermission(
    "baocao.doanhthu",
    "baocao.congno",
    "baocao.ton",
    "admin.full"
  ),
  ReportController.RenderReportPage
);

// 2. Các Route API (được gọi bởi Ajax/Fetch trong file EJS)
router.get(
  "/revenue",
  checkPermission("baocao.doanhthu", "admin.full"),
  ReportController.getDoanhThuAPI
);
router.get(
  "/debt",
  checkPermission("baocao.congno", "admin.full"),
  ReportController.getCongNoAPI
);
router.get(
  "/inventory",
  checkPermission("baocao.ton", "admin.full"),
  ReportController.getTonKhoAPI
);

module.exports = router;
