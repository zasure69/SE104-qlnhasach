// routes/billRoutes.js
const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');

//LẤY THÔNG TIN (GET)
router.get('/customer/:MaKH', billController.getCustomerInfo);  
router.get('/book/:MaSach', billController.getBookInfo);          
router.get('/detail/:MaHD', billController.getDetail);          

//TẠO HÓA ĐƠN (POST)
router.post('/create', billController.create);                

//HỈNH SỬA HÓA ĐƠN (PUT)
router.put('/:MaHD', billController.updateBill); 

//XÓA HÓA ĐƠN (DELETE)
router.delete('/:MaHD', billController.deleteBill); 

//LẤY HÓA ĐƠN GẦN NHẤT
router.get('/lastMaHD', billController.getLastMaHD);

module.exports = router;