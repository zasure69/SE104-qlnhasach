const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

// GET /api/customers/getCustomers
router.get('/getCustomers', customerController.getCustomers);

// POST /api/customers/createCustomers
router.post('/createCustomers', customerController.createCustomer);

// PATCH /api/customers/updateCustomers/:maKH 
router.patch('/updateCustomers/:maKH', customerController.updateCustomer);

// DELETE /api/customers/deleteCustomers/:maKH (Xóa)
router.delete('/deleteCustomers/:maKH', customerController.deleteCustomer);

module.exports = router;