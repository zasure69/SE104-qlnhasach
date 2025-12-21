const request = require('supertest');
const app = require('../index');
const resetAndSeedDatabase = require('./test_db_helper');
const jwt = require('jsonwebtoken');
const sequelize = require('../config/db'); // Import sequelize instance

describe('Data Management APIs (Authors, Genres, Book Titles, Books, Reports)', () => {
  let adminToken;
  
  beforeAll(async () => {
    await resetAndSeedDatabase(); // Reset and seed the database

    // Generate token for the seeded admin user
    const adminUser = { id: 'NV001', username: 'admin_test', role: 'Admin' };
    adminToken = jwt.sign(adminUser, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
  }, 60000); // Increased timeout for database operations to 60 seconds

  afterAll(async () => {
    await sequelize.close(); // Close the database connection
  });

  // --- REVENUE REPORT API TESTS (Kept from previous iteration) ---
  describe('Revenue Report API (/api/report/revenue)', () => {
    it('should return revenue data for a valid month and year', async () => {
      // Assuming there is sales data for month 1 (January) and year 2023
      const res = await request(app)
        .get('/api/report/revenue?month=1&year=2023')
        .set('Cookie', [`authToken=${adminToken}`]);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body).toHaveProperty('totalRevenue');
      expect(typeof res.body.totalRevenue).toBe('number');
    });

    it('should return empty data and 0 totalRevenue for a month with no sales', async () => {
      // Assuming there are no sales in month 12 (December) of 2025
      const res = await request(app)
        .get('/api/report/revenue?month=12&year=2025')
        .set('Cookie', [`authToken=${adminToken}`]);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toEqual(0);
      expect(res.body).toHaveProperty('totalRevenue');
      expect(res.body.totalRevenue).toEqual(0);
    });

    it('should return empty data and 0 totalRevenue if month or year are missing', async () => {
      const res = await request(app)
        .get('/api/report/revenue') // No month or year
        .set('Cookie', [`authToken=${adminToken}`]);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toEqual(0);
      expect(res.body).toHaveProperty('totalRevenue');
      expect(res.body.totalRevenue).toEqual(0);
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .get('/api/report/revenue?month=1&year=2023');
      expect(res.statusCode).toEqual(302);
      expect(res.headers.location).toBe('/login');
    });
  });

  // --- AUTHOR API TESTS ---
  describe('Author API (/api/books/authors)', () => {
    let newAuthorId;

    it('should create a new author', async () => {
      const res = await request(app)
        .post('/api/books/authors/create')
        .set('Cookie', [`authToken=${adminToken}`])
        .send({ HoTen: 'Tác giả test mới', NamSinh: 1980 }); // Removed MaTacGia as it's generated

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('message', 'Thêm tác giả thành công!');
      expect(res.body).toHaveProperty('data.MaTacGia');
      newAuthorId = res.body.data.MaTacGia;
    });

    it('should update an existing author', async () => {
      const res = await request(app)
        .patch(`/api/books/authors/update/${newAuthorId}`)
        .set('Cookie', [`authToken=${adminToken}`])
        .send({ HoTen: 'Tác giả đã cập nhật', NamSinh: 1985 });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Cập nhật tác giả thành công!');
      expect(res.body.data.HoTen).toEqual('Tác giả đã cập nhật');
    });

    it('should delete an author', async () => {
      const res = await request(app)
        .delete(`/api/books/authors/delete/${newAuthorId}`)
        .set('Cookie', [`authToken=${adminToken}`]);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Xóa tác giả thành công!');
    });

    it('should return 401 if not authenticated for author operations', async () => {
      const res = await request(app)
        .post('/api/books/authors/create')
        .send({ HoTen: 'Unauthorized Author' });
      expect(res.statusCode).toEqual(302);
      expect(res.headers.location).toBe('/login');
    });
  });

  // --- GENRE API TESTS ---
  describe('Genre API (/api/books/types)', () => {
    let newGenreId;

    it('should create a new genre', async () => {
      const res = await request(app)
        .post('/api/books/types/create')
        .set('Cookie', [`authToken=${adminToken}`])
        .send({ TenTheLoai: 'Thể loại test mới' }); // Removed MaTheLoai as it's generated

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('message', 'Thêm thể loại thành công!');
      expect(res.body).toHaveProperty('data.MaTheLoai');
      newGenreId = res.body.data.MaTheLoai;
    });

    it('should update an existing genre', async () => {
      const res = await request(app)
        .patch(`/api/books/types/update/${newGenreId}`)
        .set('Cookie', [`authToken=${adminToken}`])
        .send({ TenTheLoai: 'Thể loại đã cập nhật' });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Cập nhật thể loại thành công!');
      expect(res.body.data.TenTheLoai).toEqual('Thể loại đã cập nhật');
    });

    it('should delete a genre', async () => {
      const res = await request(app)
        .delete(`/api/books/types/delete/${newGenreId}`)
        .set('Cookie', [`authToken=${adminToken}`]);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Xóa thể loại thành công!');
    });

    it('should return 401 if not authenticated for genre operations', async () => {
      const res = await request(app)
        .post('/api/books/types/create')
        .send({ TenTheLoai: 'Unauthorized Genre' });
      expect(res.statusCode).toEqual(302);
      expect(res.headers.location).toBe('/login');
    });
  });

  // --- DAUSACH (Book Title) API TESTS ---
  describe('DauSach (Book Title) API (/api/books)', () => {
    let newDauSachId;
    let tempTheLoaiId; // To be created in beforeAll
    let tempTacGiaId; // To be created in beforeAll

    beforeAll(async () => {
        // Create a genre and author for testing DauSach creation
        const genreRes = await request(app).post('/api/books/types/create').set('Cookie', [`authToken=${adminToken}`]).send({ TenTheLoai: 'Temp Genre for DS' });
        tempTheLoaiId = genreRes.body.data.MaTheLoai;
        const authorRes = await request(app).post('/api/books/authors/create').set('Cookie', [`authToken=${adminToken}`]).send({ HoTen: 'Temp Author for DS' });
        tempTacGiaId = authorRes.body.data.MaTacGia;
    });

    it('should create a new DauSach (Book Title)', async () => {
      const res = await request(app)
        .post('/api/books/createDauSach')
        .set('Cookie', [`authToken=${adminToken}`])
        .send({
          TenSach: 'Sách Đầu Sách Mới Tạo',
          TenTheLoai: 'Temp Genre for DS', // Use name, controller resolves to ID
          tacGiaIds: [tempTacGiaId] // Pass array of IDs
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('message', 'Tạo đầu sách thành công!');
      expect(res.body).toHaveProperty('dauSach.MaDauSach');
      newDauSachId = res.body.dauSach.MaDauSach;
    });

    it('should retrieve a DauSach (Book Title) by ID', async () => {
        const res = await request(app)
            .get(`/api/books/getDauSach/${newDauSachId}`)
            .set('Cookie', [`authToken=${adminToken}`]);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('dauSach.MaDauSach', newDauSachId);
        expect(res.body).toHaveProperty('dauSach.TenSach', 'Sách Đầu Sách Mới Tạo');
    });

    it('should update an existing DauSach (Book Title)', async () => {
      const res = await request(app)
        .patch(`/api/books/updateDauSach/${newDauSachId}`)
        .set('Cookie', [`authToken=${adminToken}`])
        .send({
          TenSach: 'Sách Đầu Sách Đã Cập Nhật',
          MoTa: 'Mô tả đã cập nhật',
          TenTheLoai: 'Fantasy', // Update to an existing genre
          tacGiaIds: ['TG002'] // Update to an existing author
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Cập nhật đầu sách thành công!');
      expect(res.body.dauSach.TenSach).toEqual('Sách Đầu Sách Đã Cập Nhật');
    });

    it('should delete a DauSach (Book Title)', async () => {
      const res = await request(app)
        .delete(`/api/books/deleteDauSach/${newDauSachId}`)
        .set('Cookie', [`authToken=${adminToken}`]);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Xóa đầu sách thành công!');
    });

    it('should return 401 if not authenticated for DauSach operations', async () => {
      const res = await request(app)
        .post('/api/books/createDauSach')
        .send({ TenSach: 'Unauthorized DauSach', TenTheLoai: 'Fantasy', tacGiaIds: ['TG002'] });
      expect(res.statusCode).toEqual(302);
      expect(res.headers.location).toBe('/login');
    });
  });

  // --- SACH (Book Instance) API TESTS ---
  describe('Sach (Book Instance) API (/api/books)', () => {
    let newSachId;
    let tempDauSachId; // To be created in beforeAll
    let tempTheLoaiIdForSach;
    let tempTacGiaIdForSach;

    beforeAll(async () => {
        // Create supporting data for Sach
        const genreRes = await request(app).post('/api/books/types/create').set('Cookie', [`authToken=${adminToken}`]).send({ TenTheLoai: 'Temp Genre for Sach' });
        tempTheLoaiIdForSach = genreRes.body.data.MaTheLoai;

        const authorRes = await request(app).post('/api/books/authors/create').set('Cookie', [`authToken=${adminToken}`]).send({ HoTen: 'Temp Author for Sach' });
        tempTacGiaIdForSach = authorRes.body.data.MaTacGia;

        const dauSachRes = await request(app)
            .post('/api/books/createDauSach')
            .set('Cookie', [`authToken=${adminToken}`])
            .send({
              TenSach: 'Temp DauSach for Sach Instance',
              TenTheLoai: 'Temp Genre for Sach',
              tacGiaIds: [tempTacGiaIdForSach]
            });
        tempDauSachId = dauSachRes.body.dauSach.MaDauSach;
    });

    it('should create a new Sach (Book Instance)', async () => {
      const res = await request(app)
        .post('/api/books/createSach')
        .set('Cookie', [`authToken=${adminToken}`])
        .send({
          MaDauSach: tempDauSachId,
          NhaXB: 'NXB Test Sach',
          NamXB: 2023,
          MoTa: 'Mô tả sách con test'
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('message', 'Tạo sách thành công!');
      expect(res.body).toHaveProperty('sach.MaSach');
      newSachId = res.body.sach.MaSach;
    });

    it('should retrieve a Sach (Book Instance) by ID', async () => {
        const res = await request(app)
            .get(`/api/books/getSach/${newSachId}`)
            .set('Cookie', [`authToken=${adminToken}`]);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('sach.MaSach', newSachId);
        expect(res.body).toHaveProperty('sach.NhaXB', 'NXB Test Sach');
    });

    it('should update an existing Sach (Book Instance)', async () => {
      const res = await request(app)
        .patch(`/api/books/updateSach/${newSachId}`)
        .set('Cookie', [`authToken=${adminToken}`])
        .send({
          NhaXB: 'NXB Cập Nhật',
          NamXB: 2024
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Cập nhật sách thành công!');
      expect(res.body.sach.NhaXB).toEqual('NXB Cập Nhật');
    });

    it('should delete a Sach (Book Instance)', async () => {
      const res = await request(app)
        .delete(`/api/books/deleteSach/${newSachId}`)
        .set('Cookie', [`authToken=${adminToken}`]);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Xóa sách thành công!');
    });

    it('should return 401 if not authenticated for Sach operations', async () => {
      const res = await request(app)
        .post('/api/books/createSach')
        .send({ MaDauSach: tempDauSachId, NhaXB: 'Unauthorized NXB' });
      expect(res.statusCode).toEqual(302);
      expect(res.headers.location).toBe('/login');
    });
  });
});