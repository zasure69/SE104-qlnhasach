const request = require('supertest');
const app = require('../index'); 
const sequelize = require('../config/db');
const jwt = require('jsonwebtoken');

describe('Logic: Import-Sell-Delete Constraint (Theo hình ảnh TH4)', () => {
  let adminToken;
  let bookId, dauSachId, customerId;
  let phieuNhapId_A; // Phiếu nhập chính để test
  let phieuNhapId_B; // Phiếu nhập phụ

  // Helper setup data
  beforeAll(async () => {
    await sequelize.sync({ force: false });
    const user = { id: 'NV001', username: 'admin', role: 'Admin' };
    adminToken = jwt.sign(user, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });

    // 1. Tạo Đầu Sách & Sách (Tồn ban đầu = 0)
    let res = await request(app).post('/api/books/createDauSach')
        .set('Cookie', [`authToken=${adminToken}`])
        .send({ TenSach: "Logic Test Book", TenTheLoai: "Logic", tacGiaIds: ["LogicTester"] });
    dauSachId = res.body.dauSach.MaDauSach;

    res = await request(app).post('/api/books/createSach')
        .set('Cookie', [`authToken=${adminToken}`])
        .send({ NhaXB: "NXB Logic", NamXB: 2024, MaDauSach: dauSachId });
    bookId = res.body.sach.MaSach;

    // 2. Tạo Khách hàng để bán sách (Random phone to avoid duplicate error)
    const randomPhone = "09" + Math.floor(Math.random() * 100000000);
    res = await request(app).post('/api/customers/createCustomers')
        .set('Cookie', [`authToken=${adminToken}`])
        .send({ hoTen: "Logic Buyer", soDienThoai: randomPhone, diaChi: "Test" });
    
    if (res.statusCode !== 201) console.error("Setup Customer Failed:", res.body);
    customerId = res.body.customer.MaKhachHang;
  }, 30000);

  afterAll(async () => {
    // Cleanup data
    // (Thứ tự cleanup quan trọng để tránh lỗi khóa ngoại)
    await sequelize.close();
  });

  // =========================================================================
  // SCENARIO 1: SETUP - NHẬP SÁCH
  // =========================================================================
  test('Step 1: Import 150 books (Phieu A)', async () => {
      const res = await request(app).post('/api/import/create')
          .set('Cookie', [`authToken=${adminToken}`])
          .send({
              NgayNhapPhieu: new Date().toISOString().split('T')[0],
              MaNhanVien: "NV001",
              chiTiet: [{ MaSach: bookId, SoLuong: 150, DonGiaNhap: 10000 }]
          });
      expect(res.statusCode).toBe(201);
      phieuNhapId_A = res.body.maPhieu;

      // Verify Stock = 150
      const book = await request(app).get(`/api/books/getSach/${bookId}`).set('Cookie', [`authToken=${adminToken}`]);
      expect(book.body.sach.SoLuongTon).toBe(150);
  });

  // =========================================================================
  // SCENARIO 2: BÁN HÀNG - GIẢM TỒN KHO
  // =========================================================================
  test('Step 2: Sell 140 books (Stock: 150 -> 10)', async () => {
      const res = await request(app).post('/api/bill/create')
          .set('Cookie', [`authToken=${adminToken}`])
          .send({
              MaHoaDon: `HD_LOGIC_${Date.now()}`,
              MaKhachHang: customerId,
              TongTien: 1400000, SoTienTra: 0, ConLai: 1400000,
              Details: [{ MaSach: bookId, SoLuongBan: 140, DonGiaBan: 10000, ThanhTien: 1400000 }]
          });
      expect(res.statusCode).toBe(200);

      // Verify Stock = 10
      const book = await request(app).get(`/api/books/getSach/${bookId}`).set('Cookie', [`authToken=${adminToken}`]);
      expect(book.body.sach.SoLuongTon).toBe(10);
  });

  // =========================================================================
  // SCENARIO 3: THỬ XÓA PHIẾU NHẬP -> GÂY ÂM KHO (TEST LOGIC ẢNH)
  // =========================================================================
  test('Step 3: Try Delete Phieu A (150 books) -> Should FAIL', async () => {
      // Logic: Hiện tại Tồn = 10.
      // Nếu xóa Phiếu A (đã nhập 150), Tồn sẽ là: 10 - 150 = -140.
      // Database (hoặc Controller) phải chặn hành động này.
      
      const res = await request(app)
          .delete(`/api/import/delete/${phieuNhapId_A}`)
          .set('Cookie', [`authToken=${adminToken}`]);

      // Mong đợi lỗi (400 hoặc 500)
      expect(res.statusCode).not.toBe(200);
      expect(res.body.error).toMatch(/âm/i); // Expect error message to contain "âm"
      
      // Verify Stock vẫn là 10 (Không bị trừ)
      const book = await request(app).get(`/api/books/getSach/${bookId}`).set('Cookie', [`authToken=${adminToken}`]);
      expect(book.body.sach.SoLuongTon).toBe(10);
  });

  // =========================================================================
  // SCENARIO 4: THỬ SỬA PHIẾU NHẬP (UPDATE = DELETE OLD + CREATE NEW)
  // =========================================================================
  test('Step 4: Try Update Phieu A -> Should FAIL (Due to Delete Step)', async () => {
      // Logic "Sửa = Xóa cũ + Thêm mới".
      // Bước "Xóa cũ" (trừ 150) sẽ làm kho âm -> Giao dịch phải Rollback.
      
      const res = await request(app)
          .patch(`/api/import/update/${phieuNhapId_A}`)
          .set('Cookie', [`authToken=${adminToken}`])
          .send({
              NgayNhapPhieu: new Date().toISOString().split('T')[0],
              MaNhanVien: "NV001",
              chiTiet: [{ MaSach: bookId, SoLuong: 160, DonGiaNhap: 10000 }] // Thử đổi số lượng lên 160
          });

      expect(res.statusCode).not.toBe(200);
      expect(res.body.error).toMatch(/âm/i); // Expect error message
  });

  // =========================================================================
  // SCENARIO 5: TRƯỜNG HỢP HỢP LỆ (ĐỦ TỒN ĐỂ XÓA)
  // =========================================================================
  test('Step 5: Happy Path - Import more then Delete', async () => {
      // 1. Nhập thêm 200 cuốn (Phiếu B). Tồn: 10 + 200 = 210.
      let res = await request(app).post('/api/import/create')
          .set('Cookie', [`authToken=${adminToken}`])
          .send({
              NgayNhapPhieu: new Date().toISOString().split('T')[0],
              MaNhanVien: "NV001",
              chiTiet: [{ MaSach: bookId, SoLuong: 200, DonGiaNhap: 10000 }]
          });
      expect(res.statusCode).toBe(201);
      phieuNhapId_B = res.body.maPhieu;

      // Check stock = 210
      let book = await request(app).get(`/api/books/getSach/${bookId}`).set('Cookie', [`authToken=${adminToken}`]);
      expect(book.body.sach.SoLuongTon).toBe(210);

      // 2. Bây giờ thử xóa Phiếu A (150 cuốn).
      // Tồn sau xóa: 210 - 150 = 60. (Dương -> Hợp lệ).
      res = await request(app)
          .delete(`/api/import/delete/${phieuNhapId_A}`)
          .set('Cookie', [`authToken=${adminToken}`]);
      
      expect(res.statusCode).toBe(200);

      // Check stock = 60
      book = await request(app).get(`/api/books/getSach/${bookId}`).set('Cookie', [`authToken=${adminToken}`]);
      expect(book.body.sach.SoLuongTon).toBe(60);
  });

});
