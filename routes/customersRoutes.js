const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const authorizeAdmin = require('../middleware/authAdminMiddleware');

// GET /api/customers/getCustomers
router.get('/getCustomers', customerController.getCustomers);

// POST /api/customers/createCustomers
router.post('/createCustomers', customerController.createCustomer);

// PATCH /api/customers/updateCustomers/:maKH 
router.patch('/updateCustomers/:maKH', customerController.updateCustomer);

// DELETE /api/customers/deleteCustomers/:maKH (Soft Delete)
router.delete('/deleteCustomers/:maKH', customerController.deleteCustomer);

// === ADMIN ONLY: Quản lý dữ liệu đã xóa ===
router.get('/deleted', authorizeAdmin, customerController.getDeletedCustomers);
router.patch('/restore/:maKH', authorizeAdmin, customerController.restoreCustomer);
router.delete('/hard-delete/:maKH', authorizeAdmin, customerController.hardDeleteCustomer);

module.exports = router;