/**
 * Routes quản lý phân quyền
 */
const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permissionController');
const { checkPermission } = require('../middleware/permissionMiddleware');

// Redirect /permissions -> /permissions/page
router.get('/', (req, res) => res.redirect('/permissions/page'));

// Trang quản lý phân quyền (cần quyền caidat.phanquyen)
router.get('/page', checkPermission('caidat.phanquyen', 'admin.full'), permissionController.renderPermissionPage);

// API quản lý vai trò
router.get('/vaitro', checkPermission('caidat.phanquyen', 'admin.full'), permissionController.getAllVaiTro);
router.get('/vaitro/:id', checkPermission('caidat.phanquyen', 'admin.full'), permissionController.getVaiTroById);
router.post('/vaitro', checkPermission('caidat.phanquyen', 'admin.full'), permissionController.createVaiTro);
router.put('/vaitro/:id', checkPermission('caidat.phanquyen', 'admin.full'), permissionController.updateVaiTro);
router.delete('/vaitro/:id', checkPermission('caidat.phanquyen', 'admin.full'), permissionController.deleteVaiTro);

// API quản lý quyền
router.get('/quyen', checkPermission('caidat.phanquyen', 'admin.full'), permissionController.getAllQuyen);

// API gán vai trò cho nhân viên
router.get('/nhanvien', checkPermission('caidat.phanquyen', 'admin.full'), permissionController.getNhanVienWithVaiTro);
router.post('/assign', checkPermission('caidat.phanquyen', 'admin.full'), permissionController.assignVaiTroToNhanVien);

module.exports = router;
