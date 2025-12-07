//const express = require("express");
//const router = express.Router();
//const Report = require("../controllers/reportController");

//router.get("/", Report.RenderReportPage);
//router.get("/tonkho", Report.BaoCaoTon);
//router.get("/congno", Report.BaoCaoCongNo);
//router.get("/doanhthu", Report.BaoCaoDoanhThu);



//module.exports = router;
const express = require('express');
const router = express.Router();
const ReportController = require('../controllers/reportController'); // Đường dẫn tới file vừa sửa

// 1. Route hiển thị trang báo cáo (khi bấm vào menu)
router.get('/dashboard/report', ReportController.RenderReportPage);

// 2. Các Route API (được gọi bởi Ajax/Fetch trong file EJS)
router.get('/api/report/revenue', ReportController.getDoanhThuAPI);
router.get('/api/report/debt', ReportController.getCongNoAPI);
router.get('/api/report/inventory', ReportController.getTonKhoAPI);

module.exports = router;
