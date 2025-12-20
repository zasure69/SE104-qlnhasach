const request = require('supertest');
const app = require('../index');
const resetAndSeedDatabase = require('./test_db_helper');
const jwt = require('jsonwebtoken');
const sequelize = require('../config/db'); // Import sequelize instance

describe('Books Module API Tests', () => {
  let adminToken;
  let createdBookId;
  let createdDauSachId;
  
  // Dữ liệu mẫu để test
  const testDauSach = {
    TenSach: "Dế Mèn Phiêu Lưu Ký Test",
    TenTheLoai: "Truyện Thiếu Nhi",
    tacGiaIds: ["Tô Hoài Test"]
  };

  const testBook = {
    NhaXB: "NXB Kim Dong",
    NamXB: 2023,
    MoTa: "Sách mới nhập"
  };

  beforeAll(async () => {
    await resetAndSeedDatabase(); // Reset and seed the database

    // Generate token for the seeded admin user
    const adminUser = { id: 'NV001', username: 'admin_test', role: 'Admin' };
    adminToken = jwt.sign(adminUser, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
  }, 30000);

  afterAll(async () => {
    //await sequelize.close(); // Close the database connection
  });

  describe('1. Quản lý Đầu Sách (Titles)', () => {
    it('POST /api/books/createDauSach - Tạo đầu sách mới', async () => {
        const res = await request(app)
            .post('/api/books/createDauSach')
            .set('Cookie', [`authToken=${adminToken}`])
            .send(testDauSach);
        
        if (res.statusCode !== 201) {
             console.log("Create DauSach Failed Response:", res.body);
        }

        expect(res.statusCode).toBe(201);
        expect(res.body.dauSach).toHaveProperty('MaDauSach');
        createdDauSachId = res.body.dauSach.MaDauSach;
    });

    it('GET /api/books/getDauSach/:id - Lấy thông tin đầu sách vừa tạo', async () => {
        const res = await request(app)
            .get(`/api/books/getDauSach/${createdDauSachId}`)
            .set('Cookie', [`authToken=${adminToken}`]);

        expect(res.statusCode).toBe(200);
        expect(res.body.dauSach.TenSach).toBe(testDauSach.TenSach);
    });
  });

  describe('2. Quản lý Sách (Physical Books)', () => {
    it('POST /api/books/createSach - Tạo sách từ đầu sách trên', async () => {
        const bookPayload = {
            ...testBook,
            MaDauSach: createdDauSachId
        };

        const res = await request(app)
            .post('/api/books/createSach')
            .set('Cookie', [`authToken=${adminToken}`])
            .send(bookPayload);
        
        if (res.statusCode !== 201) {
             console.log("Create Sach Failed Response:", res.body);
        }

        expect(res.statusCode).toBe(201);
        expect(res.body.sach).toHaveProperty('MaSach');
        createdBookId = res.body.sach.MaSach;
    });

    it('GET /api/books/getSach/:id - Lấy chi tiết sách', async () => {
        const res = await request(app)
            .get(`/api/books/getSach/${createdBookId}`)
            .set('Cookie', [`authToken=${adminToken}`]);

        expect(res.statusCode).toBe(200);
        expect(res.body.sach.NhaXB).toBe(testBook.NhaXB);
    });

    it('PATCH /api/books/updateSach/:id - Cập nhật thông tin sách', async () => {
        const updateData = {
            NhaXB: "NXB Giao Duc",
        };

        const res = await request(app)
            .patch(`/api/books/updateSach/${createdBookId}`)
            .set('Cookie', [`authToken=${adminToken}`])
            .send(updateData);

        expect(res.statusCode).toBe(200);
        
        const check = await request(app)
            .get(`/api/books/getSach/${createdBookId}`)
            .set('Cookie', [`authToken=${adminToken}`]);
        expect(check.body.sach.NhaXB).toBe("NXB Giao Duc");
    });
  });

  describe('3. Dọn dẹp (Cleanup)', () => {
      it('DELETE /api/books/deleteSach/:id - Xóa sách', async () => {
          const res = await request(app)
            .delete(`/api/books/deleteSach/${createdBookId}`)
            .set('Cookie', [`authToken=${adminToken}`]);
          
          expect(res.statusCode).toBe(200);
      });

      it('DELETE /api/books/deleteDauSach/:id - Xóa đầu sách', async () => {
        const res = await request(app)
          .delete(`/api/books/deleteDauSach/${createdDauSachId}`)
          .set('Cookie', [`authToken=${adminToken}`]);
        
        expect(res.statusCode).toBe(200);
    });
  });
});
