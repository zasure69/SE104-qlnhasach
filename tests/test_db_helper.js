const db = require('../models');
const bcrypt = require('bcrypt');

const resetAndSeedDatabase = async () => {
  console.log("\n--- Resetting and Seeding Database ---");
  try {
    // Disable foreign key checks to allow dropping tables in any order
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { raw: true });
    
    // Drop all tables
    await db.sequelize.drop();
    console.log("All tables dropped.");

    // Re-enable foreign key checks
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { raw: true });
    
    // Re-sync all models (creates tables based on model definitions)
    await db.sequelize.sync({ force: true });
    console.log("All tables re-synced.");

    // Seed essential ThamSo (System Parameters)
    await db.ThamSo.bulkCreate([
      { TenThamSo: 'SoLuongNhapToiThieu', GiaTri: 150, TinhTrang: 1 },
      { TenThamSo: 'SoLuongTonToiThieuSauKhiBan', GiaTri: 20, TinhTrang: 1 },
      { TenThamSo: 'SoTienNoToiDa', GiaTri: 20000, TinhTrang: 1 },
      { TenThamSo: 'DuocThuQuaSoTienNo', GiaTri: 0, TinhTrang: 1 } // 0 = false, 1 = true
    ], { ignoreDuplicates: true });
    console.log("System parameters seeded.");

    // Seed an Admin User
    const hashedPassword = await bcrypt.hash('123', 10);
    await db.User.findOrCreate({
        where: { MaNhanVien: 'NV001' },
        defaults: {
            HoTen: 'Admin Test',
            NgaySinh: '1990-01-01',
            SoDienThoai: '0900000001',
            ChucVu: 'Admin',
            Username: 'admin_test',
            Password: hashedPassword,
            NgayNhanViec: '2023-01-01'
        }
    });
    console.log("Admin user seeded.");

    // Seed a regular employee user for non-admin tests
    const hashedPasswordStaff = await bcrypt.hash('staff123', 10);
    await db.User.findOrCreate({
        where: { MaNhanVien: 'NV002' },
        defaults: {
            HoTen: 'Staff Test',
            NgaySinh: '1995-05-05',
            SoDienThoai: '0900000002',
            ChucVu: 'NhanVien',
            Username: 'staff_test',
            Password: hashedPasswordStaff,
            NgayNhanViec: '2023-06-01'
        }
    });
    console.log("Staff user seeded.");

    // Seed TheLoai (Genres)
    await db.TheLoai.bulkCreate([
      { MaTheLoai: 'TL001', TenTheLoai: 'Test Genre', MoTa: 'Thể loại dùng cho test' },
      { MaTheLoai: 'TL002', TenTheLoai: 'Fantasy', MoTa: 'Sách giả tưởng' },
      { MaTheLoai: 'TL003', TenTheLoai: 'Test Genre for Sach', MoTa: 'Thể loại dùng cho test sách con' }
    ], { ignoreDuplicates: true });
    console.log("Genres seeded.");

    // Seed TacGia (Authors)
    await db.TacGia.bulkCreate([
      { MaTacGia: 'TG001', HoTen: 'Test Author', NamSinh: 1980 },
      { MaTacGia: 'TG002', HoTen: 'Nguyễn Nhật Ánh', NamSinh: 1955 },
      { MaTacGia: 'TG003', HoTen: 'Test Author for Sach', NamSinh: 1990 }
    ], { ignoreDuplicates: true });
    console.log("Authors seeded.");

    // Seed KhachHang (Customers)
    await db.KhachHang.bulkCreate([
        { MaKhachHang: 'KH001', HoVaTen: 'Nguyễn Văn A', GioiTinh: 'Nam', NgaySinh: '1990-01-01', SoDienThoai: '0901234567', DiaChi: '123 Đường ABC, Quận 1, TP.HCM', TongNo: 75000 },
        { MaKhachHang: 'KH002', HoVaTen: 'Trần Thị B', GioiTinh: 'Nữ', NgaySinh: '1992-02-02', SoDienThoai: '0907654321', DiaChi: '456 Đường XYZ, Quận 3, TP.HCM', TongNo: 15000 },
        { MaKhachHang: 'KH003', HoVaTen: 'Lê Văn C', GioiTinh: 'Nam', NgaySinh: '1985-03-03', SoDienThoai: '0912345678', DiaChi: '789 Đường DEF, Quận 1, TP.HCM', TongNo: 250000 }
    ], { ignoreDuplicates: true });
    console.log("Customers seeded.");

    // Seed DauSach (Book Titles)
    await db.DauSach.bulkCreate([
        { MaDauSach: 'DS001', TenSach: 'Sách Đầu Sách Mới', MaTheLoai: 'TL001', MoTa: 'Mô tả đầu sách mới' },
        { MaDauSach: 'DS002', TenSach: 'Mắt Biếc', MaTheLoai: 'TL002', MoTa: 'Truyện dài của Nguyễn Nhật Ánh' },
        { MaDauSach: 'DS003', TenSach: 'Test DauSach for Sach', MaTheLoai: 'TL003', MoTa: 'DauSach for Sach Instance Test' }
    ], { ignoreDuplicates: true });
    console.log("Book Titles seeded.");

    // Seed CT_TacGia (Book Author Details) - Link DauSach to TacGia
    await db.CT_TacGia.bulkCreate([
        { MaDauSach: 'DS001', MaTacGia: 'TG001' },
        { MaDauSach: 'DS002', MaTacGia: 'TG002' },
        { MaDauSach: 'DS003', MaTacGia: 'TG003' }
    ], { ignoreDuplicates: true });
    console.log("Book Authors linked.");

    // Seed Sach (Book Instances)
    await db.Sach.bulkCreate([
        { MaSach: 'S001', MaDauSach: 'DS001', NhaXB: 'NXB Test', NamXB: 2023 },
        { MaSach: 'S002', MaDauSach: 'DS002', NhaXB: 'NXB Trẻ', NamXB: 2019 },
        { MaSach: 'S003', MaDauSach: 'DS003', NhaXB: 'NXB Khác', NamXB: 2020 } // For Sach instance test
    ], { ignoreDuplicates: true });
    console.log("Book Instances seeded.");

    // Seed HoaDon (Invoices) and CT_HD (Invoice Details) for Revenue Report
    const ngayLapHoaDon_Jan2023 = new Date('2023-01-15T10:00:00Z');
    const ngayLapHoaDon_Feb2023 = new Date('2023-02-10T11:00:00Z');

    await db.HoaDon.bulkCreate([
      { MaHoaDon: 'HD001', NgayLapHoaDon: ngayLapHoaDon_Jan2023, MaKhachHang: 'KH001', MaNhanVien: 'NV001', TongTien: 100000, SoTienTra: 100000, ConLai: 0 },
      { MaHoaDon: 'HD002', NgayLapHoaDon: ngayLapHoaDon_Jan2023, MaKhachHang: 'KH002', MaNhanVien: 'NV001', TongTien: 50000, SoTienTra: 50000, ConLai: 0 },
      { MaHoaDon: 'HD003', NgayLapHoaDon: ngayLapHoaDon_Feb2023, MaKhachHang: 'KH001', MaNhanVien: 'NV001', TongTien: 200000, SoTienTra: 100000, ConLai: 100000 }
    ], { ignoreDuplicates: true });
    console.log("Invoices seeded.");

    await db.CT_HD.bulkCreate([
      { MaHoaDon: 'HD001', MaSach: 'S001', SoLuongBan: 2, DonGiaBan: 50000, ThanhTien: 100000 },
      { MaHoaDon: 'HD002', MaSach: 'S002', SoLuongBan: 1, DonGiaBan: 50000, ThanhTien: 50000 },
      { MaHoaDon: 'HD003', MaSach: 'S001', SoLuongBan: 4, DonGiaBan: 50000, ThanhTien: 200000 }
    ], { ignoreDuplicates: true });
    console.log("Invoice Details seeded.");

    console.log("--- Database Reset and Seed Complete ---\n");

  } catch (error) {
    console.error("Error during database reset and seed:", error);
    // Re-enable foreign key checks in case of error
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { raw: true });
    throw error;
  }
};

module.exports = resetAndSeedDatabase;
