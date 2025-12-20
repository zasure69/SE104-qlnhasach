const request = require('supertest');
const app = require('../index'); 
const resetAndSeedDatabase = require('./test_db_helper');
const jwt = require('jsonwebtoken');
const db = require('../models');
const sequelize = require('../config/db');

describe('Business Logic Module - Phase 3', () => {
  let adminToken;
  
  // IDs to track across tests
  let bookId;
  let dauSachId;
  let phieuNhapId;
  let customerId;
  let billId;
  let receiptId;

  // Mock data
  const testDauSach = {
    TenSach: "Business Flow Test Book",
    TenTheLoai: "Kinh Te",
    tacGiaIds: ["Author Flow Test"]
  };
  
  const testBook = {
      NhaXB: "NXB Business",
      NamXB: 2024
  };

  const testCustomer = {
      hoTen: "Test Business Customer",
      soDienThoai: `09${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
      diaChi: "Test Address"
  };

  beforeAll(async () => {
    await resetAndSeedDatabase(); // Reset and seed the database

    const adminUser = { id: 'NV001', username: 'admin_test', role: 'Admin' };
    adminToken = jwt.sign(adminUser, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });

    // Setup: Create Book, Customer
    let res = await request(app).post('/api/books/createDauSach')
        .set('Cookie', [`authToken=${adminToken}`]).send(testDauSach);
    dauSachId = res.body.dauSach.MaDauSach;

    res = await request(app).post('/api/books/createSach')
        .set('Cookie', [`authToken=${adminToken}`]).send({ ...testBook, MaDauSach: dauSachId });
    bookId = res.body.sach.MaSach;

    res = await request(app).post('/api/customers/createCustomers')
        .set('Cookie', [`authToken=${adminToken}`]).send(testCustomer);
    customerId = res.body.customer.MaKhachHang;
  }, 30000); 

  afterAll(async () => {
    // Cleanup is handled by resetAndSeedDatabase in each suite.
    // We can add specific cleanup here if needed for resources created within this suite.
    //await sequelize.close();
  });

  // ==========================================
  // 1. IMPORT (NHẬP SÁCH)
  // ==========================================
  describe('1. Import Books (Phieu Nhap Sach)', () => {
    
    it('Should FAIL if Import Quantity < 150 (Rule Check)', async () => {
        const payload = {
            NgayNhapPhieu: new Date().toISOString().split('T')[0],
            MaNhanVien: "NV001",
            chiTiet: [{ MaSach: bookId, SoLuong: 100, DonGiaNhap: 50000 }]
        };
        const res = await request(app).post('/api/import/create').set('Cookie', [`authToken=${adminToken}`]).send(payload);
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toMatch(/150/);
    });

    it('Should SUCCEED if Quantity >= 150 and Stock < 300', async () => {
        const payload = {
            NgayNhapPhieu: new Date().toISOString().split('T')[0],
            MaNhanVien: "NV001",
            chiTiet: [{ MaSach: bookId, SoLuong: 150, DonGiaNhap: 50000 }]
        };
        const res = await request(app).post('/api/import/create').set('Cookie', [`authToken=${adminToken}`]).send(payload);
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('maPhieu');
        phieuNhapId = res.body.maPhieu;
    });

    it('Should update Stock (SoLuongTon) correctly after Import', async () => {
        const res = await request(app).get(`/api/books/getSach/${bookId}`).set('Cookie', [`authToken=${adminToken}`]);
        expect(res.body.sach.SoLuongTon).toBe(150);
    });

    it('Should FAIL to Import if Stock >= 300 (Rule Check)', async () => {
        const boostPayload = {
            NgayNhapPhieu: new Date().toISOString().split('T')[0],
            MaNhanVien: "NV001",
            chiTiet: [ { MaSach: bookId, SoLuong: 150, DonGiaNhap: 50000 } ]
        };
        let res = await request(app).post('/api/import/create').set('Cookie', [`authToken=${adminToken}`]).send(boostPayload);
        expect(res.statusCode).toBe(201);
        
        const failPayload = {
            NgayNhapPhieu: new Date().toISOString().split('T')[0],
            MaNhanVien: "NV001",
            chiTiet: [ { MaSach: bookId, SoLuong: 150, DonGiaNhap: 50000 } ]
        };
        res = await request(app).post('/api/import/create').set('Cookie', [`authToken=${adminToken}`]).send(failPayload);
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toMatch(/300/);
    });
  });

  // ==========================================
  // 2. BILL (BÁN SÁCH)
  // ==========================================
  describe('2. Bill (Hoa Don Ban Sach)', () => {
      
      it('Should Create Bill Successfully (Decrease Stock, Increase Debt within limit)', async () => {
          billId = `HD_TEST_${Date.now()}`;
          const sellQty = 1;
          const price = 15000;
          const total = sellQty * price;
          const paid = 0; 
          const debt = total - paid; // 15000

          const payload = {
              MaHoaDon: billId, MaKhachHang: customerId,
              TongTien: total, SoTienTra: paid, ConLai: debt,
              Details: [{ MaSach: bookId, SoLuongBan: sellQty, DonGiaBan: price, ThanhTien: total }]
          };

          const res = await request(app).post('/api/bill/create')
              .set('Cookie', [`authToken=${adminToken}`]).send(payload);
          expect(res.statusCode).toBe(200);

          // Verify Stock Decreased: 300 - 1 = 299
          const bookCheck = await request(app).get(`/api/books/getSach/${bookId}`).set('Cookie', [`authToken=${adminToken}`]);
          expect(bookCheck.body.sach.SoLuongTon).toBe(299);

          // Verify Customer Debt Increased: 0 + 15000
          const custCheck = await request(app).get(`/api/customers/getCustomers`).set('Cookie', [`authToken=${adminToken}`]);
          const cust = custCheck.body.find(c => c.MaKhachHang === customerId);
          expect(parseFloat(cust.TongNo)).toBe(debt);
      });

      it('Should FAIL to Create Bill if Stock Insufficient', async () => {
          const failBillId = `HD_FAIL_${Date.now()}`;
          const payload = {
              MaHoaDon: failBillId, MaKhachHang: customerId,
              TongTien: 100000, SoTienTra: 100000, ConLai: 0,
              Details: [{ MaSach: bookId, SoLuongBan: 1000, DonGiaBan: 52500, ThanhTien: 52500000 }] 
          };

          const res = await request(app).post('/api/bill/create')
              .set('Cookie', [`authToken=${adminToken}`]).send(payload);
          expect(res.statusCode).toBe(400); 
      });
  });

  // ==========================================
  // 3. RECEIPTS (PHIẾU THU)
  // ==========================================
  describe('3. Receipt (Phieu Thu Tien)', () => {
      it('Should Create Receipt Successfully (Decrease Debt)', async () => {
          receiptId = `PT_TEST_${Date.now()}`;
          const custCheckBefore = await request(app).get(`/api/customers/getCustomers`).set('Cookie', [`authToken=${adminToken}`]);
          const currentDebt = parseFloat(custCheckBefore.body.find(c => c.MaKhachHang === customerId).TongNo);
          
          const payAmount = 10000;

          const payload = {
              MaPhieuThu: receiptId, MaKhachHang: customerId,
              NgayThuTien: new Date(), SoTienThu: payAmount
          };

          const res = await request(app).post('/api/receipts/create')
              .set('Cookie', [`authToken=${adminToken}`]).send(payload);
          expect(res.statusCode).toBe(200);

          const custCheckAfter = await request(app).get(`/api/customers/getCustomers`).set('Cookie', [`authToken=${adminToken}`]);
          const newDebt = parseFloat(custCheckAfter.body.find(c => c.MaKhachHang === customerId).TongNo);
          
          expect(newDebt).toBe(currentDebt - payAmount);
      });
  });

});
