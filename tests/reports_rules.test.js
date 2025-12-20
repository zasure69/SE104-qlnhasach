const request = require('supertest');
const app = require('../index'); 
const resetAndSeedDatabase = require('./test_db_helper');
const jwt = require('jsonwebtoken');
const db = require('../models');
const sequelize = require('../config/db'); // Import sequelize

describe('Phase 4: Reports & System Settings', () => {
  let adminToken;
  let bookId, dauSachId, customerId, billId, phieuNhapId;

  // Setup Data for Reports
  const setupData = async () => {
      // Create Report Data
      let res = await request(app).post('/api/books/createDauSach')
          .set('Cookie', [`authToken=${adminToken}`])
          .send({ TenSach: "Report Test Book", TenTheLoai: "Report", tacGiaIds: ["Reporter"] });
      dauSachId = res.body.dauSach.MaDauSach;

      res = await request(app).post('/api/books/createSach')
          .set('Cookie', [`authToken=${adminToken}`])
          .send({ NhaXB: "NXB Report", NamXB: 2024, MaDauSach: dauSachId });
      bookId = res.body.sach.MaSach;

      // Import Book - last month
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1); 
      const dateForImport = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 15, 10, 0, 0);
      const formattedDateForImport = `${dateForImport.getFullYear()}-${String(dateForImport.getMonth() + 1).padStart(2, '0')}-${String(dateForImport.getDate()).padStart(2, '0')} ${String(dateForImport.getHours()).padStart(2, '0')}:${String(dateForImport.getMinutes()).padStart(2, '0')}:${String(dateForImport.getSeconds()).padStart(2, '0')}`;
      
      res = await request(app).post('/api/import/create')
          .set('Cookie', [`authToken=${adminToken}`])
          .send({
              NgayNhapPhieu: formattedDateForImport, 
              MaNhanVien: "NV001",
              chiTiet: [{ MaSach: bookId, SoLuong: 200, DonGiaNhap: 10000 }]
          });
      phieuNhapId = res.body.maPhieu;

      // Sell Book - current month (fully paid to avoid debt rule)
      const currentMonth = new Date(); 
      const dateForBill = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 20, 14, 30, 0);
      const formattedDateForBill = `${dateForBill.getFullYear()}-${String(dateForBill.getMonth() + 1).padStart(2, '0')}-${String(dateForBill.getDate()).padStart(2, '0')} ${String(dateForBill.getHours()).padStart(2, '0')}:${String(dateForBill.getMinutes()).padStart(2, '0')}:${String(dateForBill.getSeconds()).padStart(2, '0')}`;

      // Generate random phone to avoid unique constraint errors on repeated test runs
      const randomPhone = "09" + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
      res = await request(app).post('/api/customers/createCustomers')
          .set('Cookie', [`authToken=${adminToken}`])
          .send({ hoTen: "Report Customer", soDienThoai: randomPhone, diaChi: "Hanoi" });
      customerId = res.body.customer.MaKhachHang;

      billId = `HD_RP_${Date.now()}`;
      res = await request(app).post('/api/bill/create')
          .set('Cookie', [`authToken=${adminToken}`])
          .send({
              MaHoaDon: billId,
              MaKhachHang: customerId,
              NgayLapHoaDon: formattedDateForBill,
              TongTien: 15000, // Reduced to avoid debt limit
              SoTienTra: 15000, // Fully paid
              ConLai: 0,
              Details: [{ MaSach: bookId, SoLuongBan: 10, DonGiaBan: 1500, ThanhTien: 15000 }]
          });
      billId = res.body.MaHoaDon; 
  };

  beforeAll(async () => {
    await resetAndSeedDatabase(); 

    const adminUser = { id: 'NV001', username: 'admin_test', role: 'Admin' };
    adminToken = jwt.sign(adminUser, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
    
    await setupData();

  }, 60000); 

  afterAll(async () => {
      if (billId) await request(app).delete(`/api/bill/${billId}`).set('Cookie', [`authToken=${adminToken}`]);
      if (phieuNhapId) await request(app).delete(`/api/import/delete/${phieuNhapId}`).set('Cookie', [`authToken=${adminToken}`]);
      if (customerId) await request(app).delete(`/api/customers/deleteCustomers/${customerId}`).set('Cookie', [`authToken=${adminToken}`]);
      if (bookId) await request(app).delete(`/api/books/deleteSach/${bookId}`).set('Cookie', [`authToken=${adminToken}`]);
      if (dauSachId) await request(app).delete(`/api/books/deleteDauSach/${dauSachId}`).set('Cookie', [`authToken=${adminToken}`]);
  
      await sequelize.close(); 
    }, 60000);

  // ==========================================
  // 1. REPORTS (BÁO CÁO)
  // ==========================================
  describe('A. Report Generation', () => {
      
      it('GET /api/reports/api/report/inventory - Should calculate Inventory correctly', async () => {
          const currentMonth = new Date().getMonth() + 1;
          const currentYear = new Date().getFullYear();

          const res = await request(app)
              .get('/api/reports/api/report/inventory')
              .query({ month: currentMonth, year: currentYear })
              .set('Cookie', [`authToken=${adminToken}`]);

          expect(res.statusCode).toBe(200);
          const reportItem = res.body.data.find(i => i.MaSach === bookId);
          expect(reportItem).toBeDefined();
          
          expect(reportItem.TonDau).toBe(200); 
          expect(reportItem.Nhap).toBe(0);
          expect(reportItem.Ban).toBe(10);
          expect(reportItem.TonCuoi).toBe(190);
      });

      it('GET /api/reports/api/report/debt - Should calculate Debt correctly', async () => {
          const currentMonth = new Date().getMonth() + 1;
          const currentYear = new Date().getFullYear();

          const res = await request(app)
              .get('/api/reports/api/report/debt')
              .query({ month: currentMonth, year: currentYear })
              .set('Cookie', [`authToken=${adminToken}`]);

          expect(res.statusCode).toBe(200);
          const reportItem = res.body.data.find(i => i.MaKhachHang === customerId);
          expect(reportItem).not.toBeDefined(); // No debt expected since bill is fully paid
      });
  });

  // ==========================================
  // 2. SYSTEM RULES (QUY ĐỊNH)
  // ==========================================
  describe('B. System Rules (Admin Only)', () => {
      it('PATCH /api/change-rules/:tenThamSo - Admin can update rules', async () => {
          const newValue = 200;
          const res = await request(app)
              .patch('/api/change-rules/SoLuongNhapToiThieu')
              .set('Cookie', [`authToken=${adminToken}`])
              .send({ GiaTri: newValue });
          
          expect(res.statusCode).toBe(200);
          expect(res.body.rule.GiaTri).toBe(newValue);

          // Restore value to 150 (seed default)
          await request(app)
              .patch('/api/change-rules/SoLuongNhapToiThieu')
              .set('Cookie', [`authToken=${adminToken}`])
              .send({ GiaTri: 150 });
      });

      it('PATCH /api/change-rules/:tenThamSo - Non-Admin should fail', async () => {
          const staffUser = { id: 'NV002', username: 'staff_test', role: 'NhanVien' };
          const staffToken = jwt.sign(staffUser, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });

          const res = await request(app)
              .patch('/api/change-rules/SoLuongNhapToiThieu')
              .set('Cookie', [`authToken=${staffToken}`])
              .send({ GiaTri: 999 });
          
          expect(res.statusCode).toBe(403);
      });
  });

});
