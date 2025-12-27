// routes/billRoutes.js
const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const authorizeAdmin = require('../middleware/authAdminMiddleware');

// LAY THONG TIN (GET)
router.get('/customer/:MaKH', billController.getCustomerInfo);  
router.get('/book/:MaSach', billController.getBookInfo);          
router.get('/detail/:MaHD', billController.getDetail);          

// TAO HOA DON (POST)
router.post('/create', billController.create);                

// CHINH SUA HOA DON (PUT)
router.put('/:MaHD', billController.updateBill); 

// XOA HOA DON (DELETE - SOFT)
router.delete('/:MaHD', billController.deleteBill); 

// LAY HOA DON GAN NHAT
router.get('/lastMaHD', billController.getLastMaHD);

// === ADMIN ONLY: Quan ly du lieu da xoa ===
router.get('/admin/deleted', authorizeAdmin, billController.getDeletedBills);
router.patch('/admin/restore/:MaHD', authorizeAdmin, billController.restoreBill);
router.delete('/admin/hard-delete/:MaHD', authorizeAdmin, billController.hardDeleteBill);

module.exports = router;
