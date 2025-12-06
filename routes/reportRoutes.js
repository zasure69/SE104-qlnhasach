const express = require("express");
const router = express.Router();
const Report = require("../controllers/reportController");

router.get("/", Report.RenderReportPage);
router.get("/tonkho", Report.BaoCaoTon);
router.get("/congno", Report.BaoCaoCongNo);
router.get("/doanhthu", Report.BaoCaoDoanhThu);



module.exports = router;
