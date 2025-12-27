const db = require('../models');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');

// Helper: generate new MaDauSach (prefix DS)
async function generateNewDauSachId() {
  const prefix = "DS";
  const paddingLength = 3; // Sẽ tạo ra DS001, DS002...

  const lastDauSach = await db.DauSach.findOne({
    order: [
      [
        db.sequelize.literal(
          `CAST(SUBSTRING(MaDauSach, ${prefix.length + 1}) AS UNSIGNED)`
        ),
        "DESC",
      ],
    ],
    attributes: ["MaDauSach"],
    raw: true,
  });

  let lastIdNumber = 0;
  if (lastDauSach && lastDauSach.MaDauSach) {
    try {
      lastIdNumber = parseInt(
        lastDauSach.MaDauSach.substring(prefix.length),
        10
      );
    } catch (error) {
      console.error("Lỗi khi phân tích Mã Đầu Sách cuối cùng:", error);
    }
  }
  const newIdNumber = lastIdNumber + 1;
  return prefix + String(newIdNumber).padStart(paddingLength, "0");
}

// Helper: generate new MaSach (prefix S)
async function generateNewSachId() {
  const prefix = "S";
  const paddingLength = 3; // Sẽ tạo ra S001, S002...

  const lastSach = await db.Sach.findOne({
    order: [
      [
        db.sequelize.literal(
          `CAST(SUBSTRING(MaSach, ${prefix.length + 1}) AS UNSIGNED)`
        ),
        "DESC",
      ],
    ],
    attributes: ["MaSach"],
    raw: true,
  });

  let lastIdNumber = 0;
  if (lastSach && lastSach.MaSach) {
    try {
      lastIdNumber = parseInt(lastSach.MaSach.substring(prefix.length), 10);
    } catch (error) {
      console.error("Lỗi khi phân tích Mã Sách cuối cùng:", error);
    }
  }
  const newIdNumber = lastIdNumber + 1;
  return prefix + String(newIdNumber).padStart(paddingLength, "0");
}

// Hàm sinh mã Thể loại mới (Ví dụ: TL001, TL002...)
const generateNewMaTheLoai = async () => {
  const lastTheLoai = await db.TheLoai.findOne({
    order: [["MaTheLoai", "DESC"]],
    raw: true
  });
  if (!lastTheLoai) return "TL001";

  // Tách số từ mã cũ (VD: "TL015" -> 15)
  const lastIdNum = parseInt(lastTheLoai.MaTheLoai.replace(/\D/g, ""));
  const newIdNum = lastIdNum + 1;

  // Format lại thành chuỗi 3 số (VD: 16 -> "TL016")
  return `TL${newIdNum.toString().padStart(3, "0")}`;
};

// Hàm sinh mã Tác giả mới (Ví dụ: TG001, TG002...)
const generateNewMaTacGia = async () => {
  const lastTacGia = await db.TacGia.findOne({
    order: [["MaTacGia", "DESC"]],
    raw: true
  });
  if (!lastTacGia) return "TG001";

  const lastIdNum = parseInt(lastTacGia.MaTacGia.replace(/\D/g, ""));
  const newIdNum = lastIdNum + 1;
  return `TG${newIdNum.toString().padStart(3, "0")}`;
};

// Hàm sinh mã Khách hàng mới (Ví dụ: KH001, KH002...)
const generateNewMaKhachHang = async () => {
  const lastKhachHang = await db.KhachHang.findOne({
    order: [["MaKhachHang", "DESC"]],
    raw: true
  });
  if (!lastKhachHang) return "KH001";

  const lastIdNum = parseInt(lastKhachHang.MaKhachHang.replace(/\D/g, ""));
  const newIdNum = lastIdNum + 1;
  return `KH${newIdNum.toString().padStart(3, "0")}`;
};

// Hàm sinh mã Hóa đơn mới (Ví dụ: HD001, HD002...)
const generateNewMaHoaDon = async () => {
    const lastHoaDon = await db.HoaDon.findOne({
        order: [['MaHoaDon', 'DESC']],
        raw: true
    });
    if (!lastHoaDon) return 'HD001';
    const lastIdNum = parseInt(lastHoaDon.MaHoaDon.replace(/\D/g, ''));
    const newIdNum = lastIdNum + 1;
    return `HD${newIdNum.toString().padStart(3, '0')}`;
};

// Hàm sinh mã Phiếu nhập sách mới (Ví dụ: PNS001, PNS002...)
const generateNewMaPhieuNhapSach = async () => {
    const lastPhieuNhapSach = await db.PhieuNhapSach.findOne({
        order: [['MaPhieuNhap', 'DESC']],
        raw: true
    });
    if (!lastPhieuNhapSach) return 'PNS001';
    const lastIdNum = parseInt(lastPhieuNhapSach.MaPhieuNhap.replace(/\D/g, ''));
    const newIdNum = lastIdNum + 1;
    return `PNS${newIdNum.toString().padStart(3, '0')}`;
};

// Hàm sinh mã Phiếu thu tiền mới (Ví dụ: PTT001, PTT002...)
const generateNewMaPhieuThuTien = async () => {
    const lastPhieuThuTien = await db.PhieuThuTien.findOne({
        order: [['MaPhieuThu', 'DESC']],
        raw: true
    });
    if (!lastPhieuThuTien) return 'PTT001';
    const lastIdNum = parseInt(lastPhieuThuTien.MaPhieuThu.replace(/\D/g, ''));
    const newIdNum = lastIdNum + 1;
    return `PTT${newIdNum.toString().padStart(3, '0')}`;
};


const seedData = async () => {
  console.log("\n--- Starting Database Seeding ---");
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

    // Seed Users
    const hashedPasswordAdmin = await bcrypt.hash('123', 10);
    await db.NhanVien.create({
        MaNhanVien: 'NV001',
        HoTen: 'Admin User',
        NgaySinh: '1990-01-01',
        SoDienThoai: '0901112223',
        ChucVu: 'Admin',
        Username: 'admin',
        Password: hashedPasswordAdmin,
        NgayNhanViec: '2022-01-01'
    });
    const hashedPasswordStaff = await bcrypt.hash('staff123', 10);
    await db.NhanVien.create({
        MaNhanVien: 'NV002',
        HoTen: 'Staff User',
        NgaySinh: '1995-05-10',
        SoDienThoai: '0904445556',
        ChucVu: 'NhanVien',
        Username: 'staff',
        Password: hashedPasswordStaff,
        NgayNhanViec: '2023-03-15'
    });
    console.log("Users seeded.");

    // Seed TheLoai
    const tlVH = await db.TheLoai.create({ MaTheLoai: await generateNewMaTheLoai(), TenTheLoai: 'Văn Học', MoTa: 'Sách văn học các loại' });
    const tlKH = await db.TheLoai.create({ MaTheLoai: await generateNewMaTheLoai(), TenTheLoai: 'Khoa Học', MoTa: 'Sách khoa học, công nghệ' });
    const tlLS = await db.TheLoai.create({ MaTheLoai: await generateNewMaTheLoai(), TenTheLoai: 'Lịch Sử', MoTa: 'Sách về lịch sử' });
    console.log("Genres seeded.");

    // Seed TacGia
    const tgNNA = await db.TacGia.create({ MaTacGia: await generateNewMaTacGia(), HoTen: 'Nguyễn Nhật Ánh', NamSinh: 1955 });
    const tgNT = await db.TacGia.create({ MaTacGia: await generateNewMaTacGia(), HoTen: 'Ngô Tất Tố', NamSinh: 1893 });
    const tgHCM = await db.TacGia.create({ MaTacGia: await generateNewMaTacGia(), HoTen: 'Hồ Chí Minh', NamSinh: 1890 });
    console.log("Authors seeded.");

    // Seed KhachHang
    const khA = await db.KhachHang.create({ MaKhachHang: await generateNewMaKhachHang(), HoVaTen: 'Nguyễn Văn A', GioiTinh: 'Nam', NgaySinh: '1990-01-01', SoDienThoai: '0901234567', DiaChi: '123 Nguyễn Văn Cừ', TongNo: 15000 });
    const khB = await db.KhachHang.create({ MaKhachHang: await generateNewMaKhachHang(), HoVaTen: 'Trần Thị B', GioiTinh: 'Nữ', NgaySinh: '1988-02-15', SoDienThoai: '0918765432', DiaChi: '456 Lê Lợi', TongNo: 25000 });
    const khC = await db.KhachHang.create({ MaKhachHang: await generateNewMaKhachHang(), HoVaTen: 'Lê Văn C', GioiTinh: 'Nam', NgaySinh: '1992-03-20', SoDienThoai: '0987123456', DiaChi: '789 Võ Thị Sáu', TongNo: 0 });
    console.log("Customers seeded.");

    // Seed DauSach
    const dsMB = await db.DauSach.create({ MaDauSach: await generateNewDauSachId(), TenSach: 'Mắt Biếc', MaTheLoai: tlVH.MaTheLoai, MoTa: 'Truyện dài của Nguyễn Nhật Ánh' });
    const dsDBN = await db.DauSach.create({ MaDauSach: await generateNewDauSachId(), TenSach: 'Đất Nước Đứng Lên', MaTheLoai: tlLS.MaTheLoai, MoTa: 'Lịch sử kháng chiến' });
    const dsVT = await db.DauSach.create({ MaDauSach: await generateNewDauSachId(), TenSach: 'Vợ Chồng A Phủ', MaTheLoai: tlVH.MaTheLoai, MoTa: 'Truyện ngắn của Tô Hoài' });
    console.log("Book Titles seeded.");

    // Link DauSach to TacGia via CT_TacGia
    await db.CT_TacGia.bulkCreate([
        { MaDauSach: dsMB.MaDauSach, MaTacGia: tgNNA.MaTacGia },
        { MaDauSach: dsDBN.MaDauSach, MaTacGia: tgHCM.MaTacGia },
        { MaDauSach: dsVT.MaDauSach, MaTacGia: tgNT.MaTacGia }
    ]);
    console.log("Book Authors linked.");

    // Seed Sach
    const sachMB1 = await db.Sach.create({ MaSach: await generateNewSachId(), MaDauSach: dsMB.MaDauSach, NhaXB: 'NXB Trẻ', NamXB: 2019, SoLuongTon: 50 });
    const sachMB2 = await db.Sach.create({ MaSach: await generateNewSachId(), MaDauSach: dsMB.MaDauSach, NhaXB: 'NXB Kim Đồng', NamXB: 2021, SoLuongTon: 30 });
    const sachDBN = await db.Sach.create({ MaSach: await generateNewSachId(), MaDauSach: dsDBN.MaDauSach, NhaXB: 'NXB Chính Trị Quốc Gia', NamXB: 2000, SoLuongTon: 20 });
    const sachVT = await db.Sach.create({ MaSach: await generateNewSachId(), MaDauSach: dsVT.MaDauSach, NhaXB: 'NXB Văn Học', NamXB: 1995, SoLuongTon: 40 });
    console.log("Book Instances seeded.");

    // Seed PhieuNhapSach and CT_PNS
    const pns1 = await db.PhieuNhapSach.create({ MaPhieuNhap: await generateNewMaPhieuNhapSach(), NgayNhapPhieu: new Date('2023-01-10'), TongTien: 1000000, MaNhanVien: 'NV001' });
    await db.CT_PNS.bulkCreate([
        { MaPhieuNhap: pns1.MaPhieuNhap, MaSach: sachMB1.MaSach, SoLuong: 50, DonGiaNhap: 15000, DonGiaBan: 30000, ThanhTien: 750000 },
        { MaPhieuNhap: pns1.MaPhieuNhap, MaSach: sachDBN.MaSach, SoLuong: 25, DonGiaNhap: 10000, DonGiaBan: 20000, ThanhTien: 250000 }
    ]);
    console.log("Purchase Invoices seeded.");

    // Seed HoaDon and CT_HD for January 2023 revenue
    const hd1 = await db.HoaDon.create({ MaHoaDon: await generateNewMaHoaDon(), NgayLapHoaDon: new Date('2023-01-15'), MaKhachHang: khA.MaKhachHang, MaNhanVien: 'NV002', TongTien: 90000, SoTienTra: 90000, ConLai: 0 });
    await db.CT_HD.bulkCreate([
        { MaHoaDon: hd1.MaHoaDon, MaSach: sachMB1.MaSach, SoLuongBan: 2, DonGiaBan: 30000, ThanhTien: 60000 },
        { MaHoaDon: hd1.MaHoaDon, MaSach: sachDBN.MaSach, SoLuongBan: 1, DonGiaBan: 30000, ThanhTien: 30000 }
    ]);

    const hd2 = await db.HoaDon.create({ MaHoaDon: await generateNewMaHoaDon(), NgayLapHoaDon: new Date('2023-01-20'), MaKhachHang: khB.MaKhachHang, MaNhanVien: 'NV002', TongTien: 60000, SoTienTra: 60000, ConLai: 0 });
    await db.CT_HD.bulkCreate([
        { MaHoaDon: hd2.MaHoaDon, MaSach: sachMB2.MaSach, SoLuongBan: 2, DonGiaBan: 30000, ThanhTien: 60000 }
    ]);

    // Sales for February 2023
    const hd3 = await db.HoaDon.create({ MaHoaDon: await generateNewMaHoaDon(), NgayLapHoaDon: new Date('2023-02-05'), MaKhachHang: khC.MaKhachHang, MaNhanVien: 'NV002', TongTien: 120000, SoTienTra: 120000, ConLai: 0 });
    await db.CT_HD.bulkCreate([
        { MaHoaDon: hd3.MaHoaDon, MaSach: sachVT.MaSach, SoLuongBan: 3, DonGiaBan: 40000, ThanhTien: 120000 }
    ]);
    console.log("Sales Invoices seeded.");

    // Seed PhieuThuTien
    await db.PhieuThuTien.create({ MaPhieuThu: await generateNewMaPhieuThuTien(), MaKhachHang: khA.MaKhachHang, NgayThuTien: new Date('2023-01-25'), SoTienThu: 10000 });
    console.log("Payment Receipts seeded.");

    console.log("--- Database Seeding Complete ---\n");

  } catch (error) {
    console.error("Error during database seeding:", error);
    // Re-enable foreign key checks in case of error
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { raw: true });
  }
};

if (require.main === module) {
  seedData().then(() => {
    console.log("Seeding script finished.");
    process.exit(0);
  }).catch(err => {
    console.error("Seeding script failed:", err);
    process.exit(1);
  });
}

module.exports = seedData;
