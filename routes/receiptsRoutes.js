// routes/receiptsRoutes.js
const express = require('express');
const router = express.Router();
const receiptsController = require('../controllers/receiptsController');
const authorizeAdmin = require('../middleware/authAdminMiddleware');

// Lay thong tin khach hang (Dung de kiem tra no va dien thong tin khi lap phieu)
router.get('/customer/:MaKH', receiptsController.getCustomerInfo);

// TAO PHIEU THU MOI (POST)
router.post('/create', receiptsController.createReceipt);

// CAP NHAT PHIEU THU (PUT)
router.put('/:MaPhieuThu', receiptsController.updateReceipt); 

// XOA PHIEU THU (DELETE - SOFT)
router.delete('/:MaPhieuThu', receiptsController.deleteReceipt); 

// LAY MA PHIEU THU CUOI CUNG (De tao ma moi)
router.get('/lastMaPhieuThu', receiptsController.getLastMaPhieuThu);

// LAY CHI TIET PHIEU THU
router.get('/:MaPhieuThu', receiptsController.getReceiptDetail);

// === ADMIN ONLY: Quan ly du lieu da xoa ===
router.get('/admin/deleted', authorizeAdmin, receiptsController.getDeletedReceipts);
router.patch('/admin/restore/:MaPhieuThu', authorizeAdmin, receiptsController.restoreReceipt);
router.delete('/admin/hard-delete/:MaPhieuThu', authorizeAdmin, receiptsController.hardDeleteReceipt);

module.exports = router;
