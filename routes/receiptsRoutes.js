// routes/receiptsRoute.js
const express = require('express');
const router = express.Router();
const receiptsController = require('../controllers/receiptsController');

// Lấy thông tin khách hàng (Dùng để kiểm tra nợ và điền thông tin khi lập phiếu)
router.get('/customer/:MaKH', receiptsController.getCustomerInfo);

// TẠO PHIẾU THU MỚI (POST)
router.post('/create', receiptsController.createReceipt);

// CẬP NHẬT PHIẾU THU (PUT)
router.put('/:MaPhieuThu', receiptsController.updateReceipt); 

// XÓA PHIẾU THU (DELETE)
router.delete('/:MaPhieuThu', receiptsController.deleteReceipt); 

// LẤY MÃ PHIẾU THU CUỐI CÙNG (Để tạo mã mới)
router.get('/lastMaPhieuThu', receiptsController.getLastMaPhieuThu);

// LẤY CHI TIẾT PHIẾU THU
router.get('/:MaPhieuThu', receiptsController.getReceiptDetail);

module.exports = router;