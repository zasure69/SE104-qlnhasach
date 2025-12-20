const request = require('supertest');
const app = require('../index');
const resetAndSeedDatabase = require('./test_db_helper');
const jwt = require('jsonwebtoken');
const db = require('../models');
const sequelize = require('../config/db'); // Import sequelize

describe('Complex Logic: Rules & Constraints (5 Scenarios)', () => {
  let adminToken;
  let bookId, dauSachId, customerId;
  let billId_Scenario1, billId_Scenario2, billId_Scenario4;
  let receiptId_Scenario3, receiptId_Scenario5;
  let phieuNhapId_Scenario1;

  // Setup chung
  beforeAll(async () => {
    await resetAndSeedDatabase(); // Reset and seed the database before this suite

    // Generate token for the seeded admin user (NV001 from test_db_helper)
    const adminUser = { id: 'NV001', username: 'admin_test', role: 'Admin' };
    adminToken = jwt.sign(adminUser, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });

    // 1. Tạo Sách & Khách hàng mới
    let res = await request(app).post('/api/books/createDauSach')
        .set('Cookie', [`authToken=${adminToken}`])
        .send({ TenSach: "Complex Rules Test Book", TenTheLoai: "Rules", tacGiaIds: ["RuleTester"] });
    dauSachId = res.body.dauSach.MaDauSach;

    res = await request(app).post('/api/books/createSach')
        .set('Cookie', [`authToken=${adminToken}`])
        .send({ NhaXB: "NXB Rules", NamXB: 2024, MaDauSach: dauSachId });
    bookId = res.body.sach.MaSach;

    const randomPhone = `09${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
    res = await request(app).post('/api/customers/createCustomers')
        .set('Cookie', [`authToken=${adminToken}`])
        .send({ hoTen: "Rule Breaker Customer", soDienThoai: randomPhone, diaChi: "Test City" });
    customerId = res.body.customer.MaKhachHang;

  }, 30000); // Increased timeout for database operations

  afterAll(async () => {
    // DÙNG DB TRỰC TIẾP ĐỂ XÓA (Tránh dùng request(app).delete)
    
    // 1. Xóa các hóa đơn (Bill) và chi tiết liên quan
    const billIdsToDelete = [billId_Scenario1, billId_Scenario2, billId_Scenario4].filter(id => id);
    if (billIdsToDelete.length > 0) {
        // Xóa chi tiết hóa đơn trước (nếu không có cascade)
        await db.CT_HD.destroy({ where: { MaHoaDon: billIdsToDelete } });
        // Xóa hóa đơn
        await db.HoaDon.destroy({ where: { MaHoaDon: billIdsToDelete } });
    }

    // 2. Xóa phiếu thu (Receipt)
    const receiptIdsToDelete = [receiptId_Scenario3, receiptId_Scenario5].filter(id => id);
    if (receiptIdsToDelete.length > 0) {
        await db.PhieuThuTien.destroy({ where: { MaPhieuThu: receiptIdsToDelete } });
    }

    // 3. Xóa phiếu nhập (Import) và chi tiết
    if (phieuNhapId_Scenario1) {
        await db.CT_PNS.destroy({ where: { MaPhieuNhap: phieuNhapId_Scenario1 } });
        await db.PhieuNhapSach.destroy({ where: { MaPhieuNhap: phieuNhapId_Scenario1 } });
    }

    // 4. Xóa khách hàng, sách, đầu sách (Thứ tự quan trọng do khóa ngoại)
    if (customerId) {
        // Cần đảm bảo xóa hết hóa đơn/phiếu thu của khách này trước nếu có ràng buộc
        // Ở trên đã xóa theo ID cụ thể, nhưng an toàn thì xóa các bảng phụ thuộc trước
        await db.KhachHang.destroy({ where: { MaKhachHang: customerId } });
    }

    if (bookId) {
        await db.Sach.destroy({ where: { MaSach: bookId } });
    }

    if (dauSachId) {
        await db.DauSach.destroy({ where: { MaDauSach: dauSachId } });
    }
  
    // QUAN TRỌNG: Đóng kết nối để Jest thoát hoàn toàn
    //await sequelize.close(); 
  });

  // =========================================================================
  // SCENARIO 1: TỒN KHO TỐI THIỂU SAU KHI BÁN
  // =========================================================================
  describe('Rule 1: Min Stock After Sale (TonSauBan >= 20)', () => {
      test('Step 1: Import 25 books', async () => {
          // Ensure book stock is 0 initially by deleting previous imports for this book
          await db.CT_PNS.destroy({ where: { MaSach: bookId } });
          await db.Sach.update({ SoLuongTon: 0 }, { where: { MaSach: bookId } });

          const res = await request(app).post('/api/import/create')
              .set('Cookie', [`authToken=${adminToken}`])
              .send({
                  NgayNhapPhieu: new Date().toISOString().split('T')[0],
                  MaNhanVien: "NV001",
                  chiTiet: [{ MaSach: bookId, SoLuong: 200, DonGiaNhap: 10000 }] 
              });
          expect(res.statusCode).toBe(201);
          phieuNhapId_Scenario1 = res.body.maPhieu;

          // Adjust stock to 25. This mimics a previous import + sale event to set up specific test condition.
          await db.Sach.update({ SoLuongTon: 25 }, { where: { MaSach: bookId } });

          const currentStock = await db.Sach.findByPk(bookId, { attributes: ['SoLuongTon'] });
          expect(currentStock.SoLuongTon).toBe(25);
      });

      test('Step 2: Try Sell 10 books (25 - 10 = 15 < 20) -> Should FAIL', async () => {
          billId_Scenario1 = `HD_R1_${Date.now()}`;
          const res = await request(app).post('/api/bill/create')
              .set('Cookie', [`authToken=${adminToken}`])
              .send({
                  MaHoaDon: billId_Scenario1, MaKhachHang: customerId,
                  TongTien: 100000, SoTienTra: 100000, ConLai: 0,
                  Details: [{ MaSach: bookId, SoLuongBan: 10, DonGiaBan: 10000, ThanhTien: 100000 }]
              });
          
          expect(res.statusCode).toBe(400); 
          expect(res.body.message).toMatch(/tồn kho.*thấp hơn quy định/i); 

          // Verify stock is still 25
          const currentStock = await db.Sach.findByPk(bookId, { attributes: ['SoLuongTon'] });
          expect(currentStock.SoLuongTon).toBe(25);
      });
  });

  // =========================================================================
  // SCENARIO 2: NỢ TỐI ĐA
  // =========================================================================
  describe('Rule 2: Max Debt (No <= 20000)', () => {
      test('Step 1: Set Debt to 15000', async () => {
          await db.KhachHang.update({ TongNo: 15000 }, { where: { MaKhachHang: customerId } });

          const currentDebt = await db.KhachHang.findByPk(customerId, { attributes: ['TongNo'] });
          expect(parseFloat(currentDebt.TongNo)).toBe(15000);
      });

      test('Step 2: Buy 100k, Pay 90k, Owe 10k (Total Debt: 15k+10k=25k > 20k) -> Should FAIL', async () => {
          await db.Sach.update({ SoLuongTon: 100 }, { where: { MaSach: bookId } }); // Ensure enough stock

          billId_Scenario2 = `HD_R2_${Date.now()}`;
          const res = await request(app).post('/api/bill/create')
              .set('Cookie', [`authToken=${adminToken}`])
              .send({
                  MaHoaDon: billId_Scenario2, MaKhachHang: customerId,
                  TongTien: 100000, 
                  SoTienTra: 90000, 
                  ConLai: 10000, // Nợ thêm 10k
                  Details: [{ MaSach: bookId, SoLuongBan: 1, DonGiaBan: 100000, ThanhTien: 100000 }]
              });

          expect(res.statusCode).toBe(400);
          expect(res.body.message).toMatch(/nợ vượt quá/i);
          
          // Verify debt is still 15000
          const currentDebt = await db.KhachHang.findByPk(customerId, { attributes: ['TongNo'] });
          expect(parseFloat(currentDebt.TongNo)).toBe(15000);
      });
  });

  // =========================================================================
  // SCENARIO 3: THU TIỀN VƯỢT QUÁ SỐ NỢ
  // =========================================================================
  describe('Rule 3: Collect Money > Debt', () => {
      test('Step 1: Set Debt to 50000', async () => {
          await db.KhachHang.update({ TongNo: 50000 }, { where: { MaKhachHang: customerId } });
          const currentDebt = await db.KhachHang.findByPk(customerId, { attributes: ['TongNo'] });
          expect(parseFloat(currentDebt.TongNo)).toBe(50000);
      });

      test('Step 2: Try Collect 60000 -> Should FAIL', async () => {
          receiptId_Scenario3 = `PT_R3_${Date.now()}`;
          const res = await request(app).post('/api/receipts/create')
              .set('Cookie', [`authToken=${adminToken}`])
              .send({
                  MaPhieuThu: receiptId_Scenario3, MaKhachHang: customerId,
                  NgayThuTien: new Date(), SoTienThu: 60000
              });

          expect(res.statusCode).toBe(400);
          expect(res.body.message).toMatch(/không được vượt quá số nợ/i);

          // Verify debt is still 50000
          const currentDebt = await db.KhachHang.findByPk(customerId, { attributes: ['TongNo'] });
          expect(parseFloat(currentDebt.TongNo)).toBe(50000);
      });
  });

  // =========================================================================
  // SCENARIO 4: SỬA HÓA ĐƠN GÂY ÂM KHO
  // =========================================================================
  describe('Rule 4: Update Bill causes Negative Stock', () => {
      let originalMaxDebtAllowed;

      beforeAll(async () => {
          // Temporarily increase MaxDebtAllowed to ensure bill creation succeeds in Step 1
          const maxDebtRule = await db.ThamSo.findOne({ where: { TenThamSo: 'SoTienNoToiDa' } });
          originalMaxDebtAllowed = maxDebtRule ? maxDebtRule.GiaTri : 0;
          await db.ThamSo.update({ GiaTri: 100000000 }, { where: { TenThamSo: 'SoTienNoToiDa' } });
      });

      afterAll(async () => {
          // Restore original MaxDebtAllowed
          if (originalMaxDebtAllowed !== undefined) {
              await db.ThamSo.update({ GiaTri: originalMaxDebtAllowed }, { where: { TenThamSo: 'SoTienNoToiDa' } });
          }
      });

      test('Step 1: Setup - Stock 100, Sell 10 (Bill A)', async () => {
          await db.Sach.update({ SoLuongTon: 100 }, { where: { MaSach: bookId } });
          await db.KhachHang.update({ TongNo: 0 }, { where: { MaKhachHang: customerId } }); // Reset debt
          
          billId_Scenario4 = `HD_R4_${Date.now()}`;
          const createBillRes = await request(app).post('/api/bill/create')
              .set('Cookie', [`authToken=${adminToken}`])
              .send({
                  MaHoaDon: billId_Scenario4, MaKhachHang: customerId,
                  TongTien: 100000, SoTienTra: 100000, ConLai: 0,
                  Details: [{ MaSach: bookId, SoLuongBan: 10, DonGiaBan: 10000, ThanhTien: 100000 }]
              });
          expect(createBillRes.statusCode).toBe(200); // Expect success now

          const currentStock = await db.Sach.findByPk(bookId, { attributes: ['SoLuongTon'] });
          expect(currentStock.SoLuongTon).toBe(90);
      });

      test('Step 2: Drain Stock to 5 (External Event)', async () => {
          await db.Sach.update({ SoLuongTon: 5 }, { where: { MaSach: bookId } });

          const currentStock = await db.Sach.findByPk(bookId, { attributes: ['SoLuongTon'] });
          expect(currentStock.SoLuongTon).toBe(5);
      });

      test('Step 3: Update Bill A (Increase 10 to 20) -> Require 10 more -> Stock 5 -> FAIL', async () => {
          const res = await request(app).put(`/api/bill/${billId_Scenario4}`)
              .set('Cookie', [`authToken=${adminToken}`])
              .send({
                  MaKhachHang: customerId,
                  TongTien: 200000, SoTienTra: 200000, ConLai: 0,
                  Details: [{ MaSach: bookId, SoLuongBan: 20, DonGiaBan: 10000, ThanhTien: 200000 }]
              });

          expect(res.statusCode).toBe(400); // Expected 400 due to stock check in controller
          expect(res.body.message).toMatch(/không đủ tồn kho/i);

          // Verify stock is still 5 (not changed due to rollback)
          const currentStock = await db.Sach.findByPk(bookId, { attributes: ['SoLuongTon'] });
          expect(currentStock.SoLuongTon).toBe(5);
      });
  });

  // =========================================================================
  // SCENARIO 5: XÓA PHIẾU THU -> KHÔI PHỤC NỢ
  // =========================================================================
  describe('Rule 5: Delete Receipt -> Restore Debt', () => {
      test('Step 1: Setup Debt 50k, Collect 50k -> Debt 0', async () => {
          await db.KhachHang.update({ TongNo: 50000 }, { where: { MaKhachHang: customerId } });
          
          receiptId_Scenario5 = `PT_R5_${Date.now()}`;
          await request(app).post('/api/receipts/create')
              .set('Cookie', [`authToken=${adminToken}`])
              .send({
                  MaPhieuThu: receiptId_Scenario5, MaKhachHang: customerId,
                  NgayThuTien: new Date(), SoTienThu: 50000
              });
          
          const c = await db.KhachHang.findByPk(customerId);
          expect(parseFloat(c.TongNo)).toBe(0);
      });

      test('Step 2: Delete Receipt -> Debt should be 50k', async () => {
          const res = await request(app).delete(`/api/receipts/${receiptId_Scenario5}`)
              .set('Cookie', [`authToken=${adminToken}`]);
          
          expect(res.statusCode).toBe(200);

          const c = await db.KhachHang.findByPk(customerId);
          expect(parseFloat(c.TongNo)).toBe(50000);
      });
  });

});
