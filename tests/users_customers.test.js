const request = require('supertest');
const app = require('../index');
const resetAndSeedDatabase = require('./test_db_helper');
const jwt = require('jsonwebtoken');
const db = require('../models'); 
const sequelize = require('../config/db');


describe('User Operations Module (Customers & Employees)', () => {
  let adminToken;
  let staffToken;
  let createdCustomerId;
  let createdEmployeeId;

  const testCustomer = {
    hoTen: "Nguyen Van Khach Hang",
    soDienThoai: `09${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
    diaChi: "123 Duong Test"
  };

  const testEmployee = {
    username: "test_employee_user",
    password: "Password123!",
    hoTen: "Le Van Nhan Vien",
    soDienThoai: "0911222333",
    chucVu: "NhanVien",
    ngayNhanViec: new Date().toISOString().split('T')[0]
  };

  beforeAll(async () => {
    await resetAndSeedDatabase();
    const adminUser = { id: 'NV001', username: 'admin_test', role: 'Admin' };
    adminToken = jwt.sign(adminUser, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
    const staffUser = { id: 'NV002', username: 'staff_test', role: 'NhanVien' };
    staffToken = jwt.sign(staffUser, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
  }, 30000);

  afterAll(async () => {
    // No close
  });

  describe('A. Quản lý Khách hàng', () => {
    it('POST /api/customers/createCustomers - Tạo khách hàng mới', async () => {
        const res = await request(app)
            .post('/api/customers/createCustomers')
            .set('Cookie', [`authToken=${adminToken}`])
            .send(testCustomer);
        expect(res.statusCode).toBe(201);
        createdCustomerId = res.body.customer.MaKhachHang;
    });

    it('GET /api/customers/getCustomers - Lấy danh sách khách hàng', async () => {
        const res = await request(app)
            .get('/api/customers/getCustomers')
            .set('Cookie', [`authToken=${adminToken}`]);
        expect(res.statusCode).toBe(200);
        const found = res.body.find(c => c.MaKhachHang === createdCustomerId);
        expect(found).toBeTruthy();
    });

    it('PATCH /api/customers/updateCustomers/:id - Cập nhật thông tin khách hàng', async () => {
        const updateData = { diaChi: "456 Duong Moi" };
        const res = await request(app)
            .patch(`/api/customers/updateCustomers/${createdCustomerId}`)
            .set('Cookie', [`authToken=${adminToken}`])
            .send(updateData);
        expect(res.statusCode).toBe(200);
    });

    it('DELETE /api/customers/deleteCustomers/:id - Xóa khách hàng', async () => {
        const res = await request(app)
            .delete(`/api/customers/deleteCustomers/${createdCustomerId}`)
            .set('Cookie', [`authToken=${adminToken}`]);
        expect(res.statusCode).toBe(200);
    });
  });

  describe('B. Quản lý Nhân viên (Admin Only)', () => {
      it('POST /api/employees/registerEmployee - Tạo nhân viên mới', async () => {
          const uniqueEmployee = {
              ...testEmployee,
              username: `test_emp_${Date.now()}`,
              soDienThoai: `09${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`
          };
          const res = await request(app)
              .post('/api/employees/registerEmployee')
              .set('Cookie', [`authToken=${adminToken}`])
              .send(uniqueEmployee);
          expect(res.statusCode).toBe(201);
          createdEmployeeId = res.body.userId;
      });

      it('GET /api/employees/getEmployees - Lấy danh sách nhân viên', async () => {
          const res = await request(app)
              .get('/api/employees/getEmployees')
              .set('Cookie', [`authToken=${adminToken}`]);
          expect(res.statusCode).toBe(200);
          const found = res.body.find(e => e.MaNhanVien === createdEmployeeId);
          expect(found).toBeTruthy();
      });

      it('PATCH /api/employees/updateEmployee/:id - Cập nhật nhân viên', async () => {
          const updateData = { hoTen: "Le Van Nhan Vien Updated" };
          const res = await request(app)
            .patch(`/api/employees/updateEmployee/${createdEmployeeId}`)
            .set('Cookie', [`authToken=${adminToken}`])
            .send(updateData);
          expect(res.statusCode).toBe(200);
      });

      it('DELETE /api/employees/deleteEmployee/:id - Xóa nhân viên', async () => {
          const res = await request(app)
            .delete(`/api/employees/deleteEmployee/${createdEmployeeId}`)
            .set('Cookie', [`authToken=${adminToken}`]);
          expect(res.statusCode).toBe(200);
      });

      it('Non-Admin should NOT be able to access Employee Management APIs', async () => {
        const res = await request(app)
            .get('/api/employees/getEmployees')
            .set('Cookie', [`authToken=${staffToken}`]);
        expect(res.statusCode).toBe(403);
      });
  });

  describe('C. Ràng buộc toàn vẹn', () => {
    let constrainedCustomerId;
    let constrainedEmployeeId;
    let billId;
    let importSlipId;
    let receiptId;

    beforeAll(async () => {
        const customerRes = await request(app)
            .post('/api/customers/createCustomers')
            .set('Cookie', [`authToken=${adminToken}`])
            .send({ ...testCustomer, soDienThoai: `09${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}` });
        constrainedCustomerId = customerRes.body.customer.MaKhachHang;
        console.log(`constrainedCustomerId: ${constrainedCustomerId}`);

        const employeeRes = await request(app)
            .post('/api/employees/registerEmployee')
            .set('Cookie', [`authToken=${adminToken}`])
            .send({
                ...testEmployee,
                username: `const_emp_${Date.now()}`,
                soDienThoai: `09${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`
            });
        constrainedEmployeeId = employeeRes.body.userId;
        console.log(`constrainedEmployeeId: ${constrainedEmployeeId}`);

        billId = `HD_TEST_C_${Date.now()}`;
        await db.HoaDon.create({
            MaHoaDon: billId, MaKhachHang: constrainedCustomerId, MaNhanVien: constrainedEmployeeId,
            NgayLapHoaDon: new Date(), TongTien: 100000, SoTienTra: 100000, ConLai: 0
        });
        console.log(`billId: ${billId}`);

        importSlipId = `PN_TEST_C_${Date.now()}`;
        await db.PhieuNhapSach.create({
            MaPhieuNhap: importSlipId, MaNhanVien: constrainedEmployeeId,
            NgayNhapPhieu: new Date(), TongTien: 500000
        });
        console.log(`importSlipId: ${importSlipId}`);

        receiptId = `PT_TEST_C_${Date.now()}`;
        await db.PhieuThuTien.create({
            MaPhieuThu: receiptId, MaKhachHang: constrainedCustomerId,
            NgayThuTien: new Date(), SoTienThu: 50000
        });
        console.log(`receiptId: ${receiptId}`);

        // Create a BaoCaoCongNo record as well
        await db.BaoCaoCongNo.create({
          MaKhachHang: constrainedCustomerId,
          Thang: 1,
          Nam: 2023,
          NoDau: 0,
          NoCuoi: 50000,
          NoPhatSinh: 50000
        });
        console.log(`BaoCaoCongNo created for MaKhachHang: ${constrainedCustomerId}`);

    });

    afterAll(async () => {
        try {
            await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
            await db.sequelize.query(`DELETE FROM CT_HD WHERE MaHoaDon LIKE 'HD_TEST_C_%'`);
            await db.sequelize.query(`DELETE FROM HOADON WHERE MaHoaDon LIKE 'HD_TEST_C_%'`);
            await db.sequelize.query(`DELETE FROM CT_PNS WHERE MaPhieuNhap LIKE 'PN_TEST_C_%'`);
            await db.sequelize.query(`DELETE FROM PHIEUNHAPSACH WHERE MaPhieuNhap LIKE 'PN_TEST_C_%'`);
            await db.sequelize.query(`DELETE FROM PHIEUTHUTIEN WHERE MaPhieuThu LIKE 'PT_TEST_C_%'`);
            if (constrainedCustomerId) {
                await db.sequelize.query(`DELETE FROM BAOCAOCONGNO WHERE MaKhachHang = '${constrainedCustomerId}'`);
                await db.sequelize.query(`DELETE FROM KHACHHANG WHERE MaKhachHang = '${constrainedCustomerId}'`);
            }
            if (constrainedEmployeeId) {
                await db.sequelize.query(`DELETE FROM NHANVIEN WHERE MaNhanVien = '${constrainedEmployeeId}'`);
            }
            await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
        } catch (e) {}
    });

    it('Không thể xóa khách hàng đã có hóa đơn', async () => {
        const res = await request(app).delete(`/api/customers/deleteCustomers/${constrainedCustomerId}`).set('Cookie', [`authToken=${adminToken}`]);
        expect(res.statusCode).toBe(400);
    });

    it('Không thể xóa nhân viên đã lập hóa đơn', async () => {
        const res = await request(app).delete(`/api/employees/deleteEmployee/${constrainedEmployeeId}`).set('Cookie', [`authToken=${adminToken}`]);
        expect(res.statusCode).toBe(400);
    });

    it('Có thể xóa khách hàng sau khi dữ liệu liên quan đã bị xóa', async () => {
        // Ensure all related data is cleared for the constrainedCustomerId directly
        await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

        // Delete any CT_HD associated with the billId
        await db.sequelize.query(`DELETE FROM CT_HD WHERE MaHoaDon = '${billId}'`);
        // Delete the HoaDon associated with the billId
        await db.sequelize.query(`DELETE FROM HOADON WHERE MaHoaDon = '${billId}'`);

        // Delete any PhieuThuTien directly linked to the constrainedCustomerId
        await db.sequelize.query(`DELETE FROM PHIEUTHUTIEN WHERE MaKhachHang = '${constrainedCustomerId}'`);

        // Delete any BaoCaoCongNo directly linked to the constrainedCustomerId
        await db.sequelize.query(`DELETE FROM BAOCAOCONGNO WHERE MaKhachHang = '${constrainedCustomerId}'`);
        
        const remainingBaoCaoCongNo = await db.BaoCaoCongNo.findAll({ where: { MaKhachHang: constrainedCustomerId } });
        console.log(`Remaining BaoCaoCongNo records: ${JSON.stringify(remainingBaoCaoCongNo)}`);

        console.log(`Attempting to delete customer ${constrainedCustomerId} after clearing related data.`);

        await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

        // Give DB a tiny moment to settle
        await new Promise(resolve => setTimeout(resolve, 100));

        // Now attempt to delete the customer via the API
        const res = await request(app).delete(`/api/customers/deleteCustomers/${constrainedCustomerId}`).set('Cookie', [`authToken=${adminToken}`]);
        expect(res.statusCode).toBe(200);
        constrainedCustomerId = null; 
    });

    it('Có thể xóa nhân viên sau khi dữ liệu liên quan đã bị xóa', async () => {
        await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
        await db.sequelize.query(`DELETE FROM HOADON WHERE MaNhanVien = '${constrainedEmployeeId}'`);
        await db.sequelize.query(`DELETE FROM PHIEUNHAPSACH WHERE MaNhanVien = '${constrainedEmployeeId}'`);
        await db.sequelize.query(`DELETE FROM CT_PNS WHERE MaPhieuNhap = '${importSlipId}'`);
        await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

        await new Promise(resolve => setTimeout(resolve, 100));

        const res = await request(app).delete(`/api/employees/deleteEmployee/${constrainedEmployeeId}`).set('Cookie', [`authToken=${adminToken}`]);
        expect(res.statusCode).toBe(200);
        constrainedEmployeeId = null;
    });
  });
});
