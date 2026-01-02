/**
 * Script tạo dữ liệu mẫu cho hệ thống Quản lý Nhà Sách
 * Tuân thủ các quy định:
 * - SoLuongNhapToiThieu: 150 (số lượng tối thiểu khi nhập sách)
 * - SoLuongTonToiThieuSauKhiBan: 20 (số lượng tồn tối thiểu sau khi bán)
 * - SoTienNoToiDa: 20000 (số tiền nợ tối đa của khách hàng)
 * - DuocThuQuaSoTienNo: 0 (không được thu quá số tiền nợ)
 * 
 * Chạy: node scripts/seed_sample_data.js
 */

const db = require('../models');
const bcrypt = require('bcrypt');

// ============================================
// CÁC HÀM SINH MÃ TỰ ĐỘNG
// ============================================

// Sinh mã Thể loại mới (VD: TL001, TL002...)
const generateMaTheLoai = async () => {
  const lastRecord = await db.TheLoai.findOne({
    order: [['MaTheLoai', 'DESC']],
    raw: true
  });
  if (!lastRecord) return 'TL001';
  const lastNum = parseInt(lastRecord.MaTheLoai.replace(/\D/g, ''));
  return `TL${(lastNum + 1).toString().padStart(3, '0')}`;
};

// Sinh mã Tác giả mới (VD: TG001, TG002...)
const generateMaTacGia = async () => {
  const lastRecord = await db.TacGia.findOne({
    order: [['MaTacGia', 'DESC']],
    raw: true
  });
  if (!lastRecord) return 'TG001';
  const lastNum = parseInt(lastRecord.MaTacGia.replace(/\D/g, ''));
  return `TG${(lastNum + 1).toString().padStart(3, '0')}`;
};

// Sinh mã Đầu sách mới (VD: DS001, DS002...)
const generateMaDauSach = async () => {
  const lastRecord = await db.DauSach.findOne({
    order: [[db.sequelize.literal(`CAST(SUBSTRING(MaDauSach, 3) AS UNSIGNED)`), 'DESC']],
    raw: true
  });
  if (!lastRecord) return 'DS001';
  const lastNum = parseInt(lastRecord.MaDauSach.replace(/\D/g, ''));
  return `DS${(lastNum + 1).toString().padStart(3, '0')}`;
};

// Sinh mã Sách mới (VD: S001, S002...)
const generateMaSach = async () => {
  const lastRecord = await db.Sach.findOne({
    order: [[db.sequelize.literal(`CAST(SUBSTRING(MaSach, 2) AS UNSIGNED)`), 'DESC']],
    raw: true
  });
  if (!lastRecord) return 'S001';
  const lastNum = parseInt(lastRecord.MaSach.replace(/\D/g, ''));
  return `S${(lastNum + 1).toString().padStart(3, '0')}`;
};

// Sinh mã Khách hàng mới (VD: KH001, KH002...)
const generateMaKhachHang = async () => {
  const lastRecord = await db.KhachHang.findOne({
    order: [['MaKhachHang', 'DESC']],
    raw: true
  });
  if (!lastRecord) return 'KH001';
  const lastNum = parseInt(lastRecord.MaKhachHang.replace(/\D/g, ''));
  return `KH${(lastNum + 1).toString().padStart(3, '0')}`;
};

// Sinh mã Phiếu nhập sách mới (VD: PN001, PN002...)
const generateMaPhieuNhap = async () => {
  const lastRecord = await db.PhieuNhapSach.findOne({
    order: [[db.sequelize.literal(`CAST(SUBSTRING(MaPhieuNhap, 3) AS UNSIGNED)`), 'DESC']],
    raw: true
  });
  if (!lastRecord) return 'PN001';
  const lastNum = parseInt(lastRecord.MaPhieuNhap.replace(/\D/g, ''));
  return `PN${(lastNum + 1).toString().padStart(3, '0')}`;
};

// Sinh mã Hóa đơn mới (VD: HD001, HD002...)
const generateMaHoaDon = async () => {
  const lastRecord = await db.HoaDon.findOne({
    order: [[db.sequelize.literal(`CAST(SUBSTRING(MaHoaDon, 3) AS UNSIGNED)`), 'DESC']],
    raw: true
  });
  if (!lastRecord) return 'HD001';
  const lastNum = parseInt(lastRecord.MaHoaDon.replace(/\D/g, ''));
  return `HD${(lastNum + 1).toString().padStart(3, '0')}`;
};

// Sinh mã Phiếu thu tiền mới (VD: PT001, PT002...)
const generateMaPhieuThu = async () => {
  const lastRecord = await db.PhieuThuTien.findOne({
    order: [[db.sequelize.literal(`CAST(SUBSTRING(MaPhieuThu, 3) AS UNSIGNED)`), 'DESC']],
    raw: true
  });
  if (!lastRecord) return 'PT001';
  const lastNum = parseInt(lastRecord.MaPhieuThu.replace(/\D/g, ''));
  return `PT${(lastNum + 1).toString().padStart(3, '0')}`;
};

// Sinh mã Phiếu kiểm kê mới (VD: PK001, PK002...)
const generateMaPhieuKiem = async () => {
  const lastRecord = await db.PhieuKiemKe.findOne({
    order: [[db.sequelize.literal(`CAST(SUBSTRING(MaPhieuKiem, 3) AS UNSIGNED)`), 'DESC']],
    raw: true
  });
  if (!lastRecord) return 'PK001';
  const lastNum = parseInt(lastRecord.MaPhieuKiem.replace(/\D/g, ''));
  return `PK${(lastNum + 1).toString().padStart(3, '0')}`;
};

// ============================================
// MAIN SEED FUNCTION
// ============================================
const seedSampleData = async () => {
  console.log('\n========================================');
  console.log('   BẮT ĐẦU TẠO DỮ LIỆU MẪU');
  console.log('========================================\n');

  try {
    // Tắt kiểm tra foreign key để có thể xóa bảng
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { raw: true });
    await db.sequelize.drop();
    console.log('✓ Đã xóa tất cả các bảng cũ');

    // Bật lại kiểm tra foreign key
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { raw: true });

    // Đồng bộ lại tất cả models (tạo bảng mới)
    await db.sequelize.sync({ force: true });
    console.log('✓ Đã tạo lại tất cả các bảng\n');

    // ============================================
    // 1. THAM SỐ HỆ THỐNG (QUY ĐỊNH)
    // ============================================
    console.log('--- Đang tạo Tham số hệ thống ---');
    await db.ThamSo.bulkCreate([
      { TenThamSo: 'SoLuongNhapToiThieu', GiaTri: 150 },           // Số lượng nhập tối thiểu cho mỗi đầu sách
      { TenThamSo: 'SoLuongTonToiDaTruocKhiNhap', GiaTri: 300 },   // Số lượng tồn tối đa trước khi nhập (< 300 mới được nhập)
      { TenThamSo: 'SoLuongTonToiThieuSauKhiBan', GiaTri: 20 },    // Số lượng tồn tối thiểu sau khi bán (còn lại >= 20)
      { TenThamSo: 'SoTienNoToiDa', GiaTri: 2000000 },               // Số tiền nợ tối đa của khách hàng
      { TenThamSo: 'ApDungQDKiemTraTienNo', GiaTri: 0 },           // 0 = Không cho phép thu quá số nợ, 1 = Cho phép
      { TenThamSo: 'TuoiToiThieu', GiaTri: 18 },                   // Tuổi tối thiểu của nhân viên
      { TenThamSo: 'TiLeTinhDonGiaBan', GiaTri: 1.05 }             // Tỉ lệ tính đơn giá bán = Giá nhập * 1.05 (lãi 5%)
    ]);
    console.log('✓ Tham số hệ thống đã được tạo (7 quy định)');

    // ============================================
    // 2. VAI TRÒ & QUYỀN
    // ============================================
    console.log('\n--- Đang tạo Vai trò & Quyền ---');
    
    // Tạo vai trò (theo đúng hệ thống)
    const vaiTroAdmin = await db.VaiTro.create({
      TenVaiTro: 'Admin',
      MoTa: 'Quản trị viên - Toàn quyền hệ thống',
      isActive: true
    });

    const vaiTroChuCuaHang = await db.VaiTro.create({
      TenVaiTro: 'Chủ cửa hàng',
      MoTa: 'Chủ cửa hàng - Có hầu hết các quyền trừ phân quyền',
      isActive: true
    });

    const vaiTroNhanVien = await db.VaiTro.create({
      TenVaiTro: 'Nhân viên',
      MoTa: 'Nhân viên bán hàng - Bán hàng, thu tiền và quản lý khách hàng',
      isActive: true
    });

    const vaiTroThuKho = await db.VaiTro.create({
      TenVaiTro: 'Thủ kho',
      MoTa: 'Thủ kho - Quản lý kho, nhập sách và kiểm kê',
      isActive: true
    });

    // Tạo quyền (đầy đủ theo hệ thống)
    const quyenList = [
      // Quyền đặc biệt
      { MaQuyen: 'admin.full', TenQuyen: 'Toàn quyền Admin', MoTa: 'Có tất cả quyền trong hệ thống', NhomQuyen: 'admin' },
      
      // Sách
      { MaQuyen: 'sach.xem', TenQuyen: 'Xem danh sách sách', MoTa: 'Xem thông tin đầu sách, sách, thể loại, tác giả', NhomQuyen: 'sach' },
      { MaQuyen: 'sach.them', TenQuyen: 'Thêm sách mới', MoTa: 'Thêm đầu sách, sách, thể loại, tác giả mới', NhomQuyen: 'sach' },
      { MaQuyen: 'sach.sua', TenQuyen: 'Sửa thông tin sách', MoTa: 'Chỉnh sửa thông tin đầu sách, sách, thể loại, tác giả', NhomQuyen: 'sach' },
      { MaQuyen: 'sach.xoa', TenQuyen: 'Xóa sách', MoTa: 'Xóa đầu sách, sách, thể loại, tác giả khỏi hệ thống', NhomQuyen: 'sach' },
      
      // Nhập sách
      { MaQuyen: 'nhapsach.xem', TenQuyen: 'Xem phiếu nhập', MoTa: 'Xem danh sách phiếu nhập sách', NhomQuyen: 'nhapsach' },
      { MaQuyen: 'nhapsach.them', TenQuyen: 'Tạo phiếu nhập', MoTa: 'Tạo phiếu nhập sách mới', NhomQuyen: 'nhapsach' },
      { MaQuyen: 'nhapsach.sua', TenQuyen: 'Sửa phiếu nhập', MoTa: 'Chỉnh sửa phiếu nhập sách', NhomQuyen: 'nhapsach' },
      { MaQuyen: 'nhapsach.xoa', TenQuyen: 'Xóa phiếu nhập', MoTa: 'Xóa phiếu nhập sách', NhomQuyen: 'nhapsach' },
      
      // Hóa đơn
      { MaQuyen: 'hoadon.xem', TenQuyen: 'Xem hóa đơn', MoTa: 'Xem danh sách hóa đơn bán hàng', NhomQuyen: 'hoadon' },
      { MaQuyen: 'hoadon.them', TenQuyen: 'Tạo hóa đơn', MoTa: 'Tạo hóa đơn bán hàng mới', NhomQuyen: 'hoadon' },
      { MaQuyen: 'hoadon.sua', TenQuyen: 'Sửa hóa đơn', MoTa: 'Chỉnh sửa hóa đơn bán hàng', NhomQuyen: 'hoadon' },
      { MaQuyen: 'hoadon.xoa', TenQuyen: 'Xóa hóa đơn', MoTa: 'Xóa hóa đơn bán hàng', NhomQuyen: 'hoadon' },
      
      // Phiếu thu
      { MaQuyen: 'phieuthu.xem', TenQuyen: 'Xem phiếu thu', MoTa: 'Xem danh sách phiếu thu tiền', NhomQuyen: 'phieuthu' },
      { MaQuyen: 'phieuthu.them', TenQuyen: 'Tạo phiếu thu', MoTa: 'Tạo phiếu thu tiền mới', NhomQuyen: 'phieuthu' },
      { MaQuyen: 'phieuthu.xoa', TenQuyen: 'Xóa phiếu thu', MoTa: 'Xóa phiếu thu tiền', NhomQuyen: 'phieuthu' },
      
      // Khách hàng
      { MaQuyen: 'khachhang.xem', TenQuyen: 'Xem khách hàng', MoTa: 'Xem danh sách khách hàng', NhomQuyen: 'khachhang' },
      { MaQuyen: 'khachhang.them', TenQuyen: 'Thêm khách hàng', MoTa: 'Thêm khách hàng mới', NhomQuyen: 'khachhang' },
      { MaQuyen: 'khachhang.sua', TenQuyen: 'Sửa khách hàng', MoTa: 'Chỉnh sửa thông tin khách hàng', NhomQuyen: 'khachhang' },
      { MaQuyen: 'khachhang.xoa', TenQuyen: 'Xóa khách hàng', MoTa: 'Xóa khách hàng', NhomQuyen: 'khachhang' },
      
      // Nhân viên
      { MaQuyen: 'nhanvien.xem', TenQuyen: 'Xem nhân viên', MoTa: 'Xem danh sách nhân viên', NhomQuyen: 'nhanvien' },
      { MaQuyen: 'nhanvien.them', TenQuyen: 'Thêm nhân viên', MoTa: 'Thêm nhân viên mới', NhomQuyen: 'nhanvien' },
      { MaQuyen: 'nhanvien.sua', TenQuyen: 'Sửa nhân viên', MoTa: 'Chỉnh sửa thông tin nhân viên', NhomQuyen: 'nhanvien' },
      { MaQuyen: 'nhanvien.xoa', TenQuyen: 'Xóa nhân viên', MoTa: 'Xóa nhân viên', NhomQuyen: 'nhanvien' },
      
      // Kiểm kê
      { MaQuyen: 'kiemke.xem', TenQuyen: 'Xem phiếu kiểm kê', MoTa: 'Xem danh sách phiếu kiểm kê', NhomQuyen: 'kiemke' },
      { MaQuyen: 'kiemke.them', TenQuyen: 'Tạo phiếu kiểm kê', MoTa: 'Tạo phiếu kiểm kê mới', NhomQuyen: 'kiemke' },
      { MaQuyen: 'kiemke.xoa', TenQuyen: 'Xóa phiếu kiểm kê', MoTa: 'Xóa phiếu kiểm kê', NhomQuyen: 'kiemke' },
      
      // Báo cáo
      { MaQuyen: 'baocao.ton', TenQuyen: 'Xem báo cáo tồn kho', MoTa: 'Xem báo cáo tồn kho sách', NhomQuyen: 'baocao' },
      { MaQuyen: 'baocao.congno', TenQuyen: 'Xem báo cáo công nợ', MoTa: 'Xem báo cáo công nợ khách hàng', NhomQuyen: 'baocao' },
      { MaQuyen: 'baocao.doanhthu', TenQuyen: 'Xem báo cáo doanh thu', MoTa: 'Xem báo cáo doanh thu theo thể loại', NhomQuyen: 'baocao' },
      
      // Cài đặt
      { MaQuyen: 'caidat.thamso', TenQuyen: 'Chỉnh sửa quy định', MoTa: 'Chỉnh sửa tham số quy định', NhomQuyen: 'caidat' },
      { MaQuyen: 'caidat.phanquyen', TenQuyen: 'Quản lý phân quyền', MoTa: 'Quản lý vai trò và phân quyền', NhomQuyen: 'caidat' },
      { MaQuyen: 'caidat.thungrac', TenQuyen: 'Truy cập thùng rác', MoTa: 'Xem và khôi phục dữ liệu đã xóa', NhomQuyen: 'caidat' }
    ];

    await db.Quyen.bulkCreate(quyenList);

    // Gán quyền cho Admin (toàn quyền)
    await db.VaiTro_Quyen.create({ MaVaiTro: vaiTroAdmin.MaVaiTro, MaQuyen: 'admin.full' });

    // Gán quyền cho Chủ cửa hàng (hầu hết quyền trừ phân quyền)
    const quyenChuCuaHang = [
      'sach.xem', 'sach.them', 'sach.sua', 'sach.xoa',
      'nhapsach.xem', 'nhapsach.them', 'nhapsach.sua', 'nhapsach.xoa',
      'hoadon.xem', 'hoadon.them', 'hoadon.sua', 'hoadon.xoa',
      'phieuthu.xem', 'phieuthu.them', 'phieuthu.xoa',
      'khachhang.xem', 'khachhang.them', 'khachhang.sua', 'khachhang.xoa',
      'nhanvien.xem', 'nhanvien.them', 'nhanvien.sua', 'nhanvien.xoa',
      'kiemke.xem', 'kiemke.them', 'kiemke.xoa',
      'baocao.ton', 'baocao.congno', 'baocao.doanhthu',
      'caidat.thamso', 'caidat.thungrac'
    ];
    for (const maQuyen of quyenChuCuaHang) {
      await db.VaiTro_Quyen.create({ MaVaiTro: vaiTroChuCuaHang.MaVaiTro, MaQuyen: maQuyen });
    }

    // Gán quyền cho Nhân viên (bán hàng, thu tiền, quản lý khách hàng)
    const quyenNhanVien = [
      'sach.xem',
      'hoadon.xem', 'hoadon.them',
      'phieuthu.xem', 'phieuthu.them',
      'khachhang.xem', 'khachhang.them', 'khachhang.sua',
      'baocao.congno'
    ];
    for (const maQuyen of quyenNhanVien) {
      await db.VaiTro_Quyen.create({ MaVaiTro: vaiTroNhanVien.MaVaiTro, MaQuyen: maQuyen });
    }

    // Gán quyền cho Thủ kho (quản lý kho, nhập sách, kiểm kê)
    const quyenThuKho = [
      'sach.xem', 'sach.them', 'sach.sua',
      'nhapsach.xem', 'nhapsach.them', 'nhapsach.sua',
      'kiemke.xem', 'kiemke.them',
      'baocao.ton'
    ];
    for (const maQuyen of quyenThuKho) {
      await db.VaiTro_Quyen.create({ MaVaiTro: vaiTroThuKho.MaVaiTro, MaQuyen: maQuyen });
    }

    console.log('✓ Vai trò & Quyền đã được tạo (4 vai trò, 34 quyền)');

    // ============================================
    // 3. NHÂN VIÊN
    // ============================================
    console.log('\n--- Đang tạo Nhân viên ---');
    const hashedPassword = await bcrypt.hash('123', 10);

    // Admin
    const nvAdmin = await db.NhanVien.create({
      MaNhanVien: 'NV001',
      HoTen: 'Nguyễn Văn Admin',
      NgaySinh: '1985-03-15',
      SoDienThoai: '0901234567',
      ChucVu: 'Quản trị viên',
      Username: 'admin',
      Password: hashedPassword,
      NgayNhanViec: '2020-01-01',
      MaVaiTro: vaiTroAdmin.MaVaiTro,
      isDeleted: false
    });

    // Chủ cửa hàng
    const nvChuCuaHang = await db.NhanVien.create({
      MaNhanVien: 'NV002',
      HoTen: 'Trần Văn Chủ',
      NgaySinh: '1980-07-20',
      SoDienThoai: '0912345678',
      ChucVu: 'Chủ cửa hàng',
      Username: 'chucuahang',
      Password: hashedPassword,
      NgayNhanViec: '2020-01-01',
      MaVaiTro: vaiTroChuCuaHang.MaVaiTro,
      isDeleted: false
    });

    // Thủ kho
    const nvThuKho = await db.NhanVien.create({
      MaNhanVien: 'NV003',
      HoTen: 'Lê Thị Kho',
      NgaySinh: '1990-11-10',
      SoDienThoai: '0923456789',
      ChucVu: 'Thủ kho',
      Username: 'thukho',
      Password: hashedPassword,
      NgayNhanViec: '2021-06-01',
      MaVaiTro: vaiTroThuKho.MaVaiTro,
      isDeleted: false
    });

    // Nhân viên bán hàng 1
    const nvBanHang1 = await db.NhanVien.create({
      MaNhanVien: 'NV004',
      HoTen: 'Phạm Văn Bán',
      NgaySinh: '1995-05-25',
      SoDienThoai: '0934567890',
      ChucVu: 'Nhân viên bán hàng',
      Username: 'nhanvien1',
      Password: hashedPassword,
      NgayNhanViec: '2022-03-15',
      MaVaiTro: vaiTroNhanVien.MaVaiTro,
      isDeleted: false
    });

    // Nhân viên bán hàng 2
    const nvBanHang2 = await db.NhanVien.create({
      MaNhanVien: 'NV005',
      HoTen: 'Hoàng Thị Thu',
      NgaySinh: '1998-08-12',
      SoDienThoai: '0945678901',
      ChucVu: 'Nhân viên thu ngân',
      Username: 'nhanvien2',
      Password: hashedPassword,
      NgayNhanViec: '2023-01-10',
      MaVaiTro: vaiTroNhanVien.MaVaiTro,
      isDeleted: false
    });

    console.log('✓ Nhân viên đã được tạo (5 nhân viên, Password: 123)');

    // ============================================
    // 4. THỂ LOẠI SÁCH
    // ============================================
    console.log('\n--- Đang tạo Thể loại sách ---');
    const theLoaiData = [
      { TenTheLoai: 'Văn Học Việt Nam', MoTa: 'Văn học trong nước: tiểu thuyết, truyện ngắn, thơ' },
      { TenTheLoai: 'Văn Học Nước Ngoài', MoTa: 'Văn học dịch từ các nước trên thế giới' },
      { TenTheLoai: 'Khoa Học', MoTa: 'Sách khoa học tự nhiên, công nghệ' },
      { TenTheLoai: 'Kinh Tế', MoTa: 'Sách kinh doanh, tài chính, quản trị' },
      { TenTheLoai: 'Lịch Sử', MoTa: 'Sách lịch sử Việt Nam và thế giới' },
      { TenTheLoai: 'Thiếu Nhi', MoTa: 'Sách dành cho trẻ em và thanh thiếu niên' },
      { TenTheLoai: 'Tâm Lý - Kỹ Năng Sống', MoTa: 'Sách về phát triển bản thân, kỹ năng mềm' },
      { TenTheLoai: 'Giáo Khoa - Tham Khảo', MoTa: 'Sách giáo khoa và tài liệu tham khảo học tập' },
      { TenTheLoai: 'Truyện Tranh', MoTa: 'Manga, comic và truyện tranh trong nước' },
      { TenTheLoai: 'Ngoại Ngữ', MoTa: 'Sách học ngoại ngữ: Anh, Nhật, Hàn, Trung...' }
    ];

    const theLoais = [];
    for (const tl of theLoaiData) {
      const record = await db.TheLoai.create({
        MaTheLoai: await generateMaTheLoai(),
        TenTheLoai: tl.TenTheLoai,
        MoTa: tl.MoTa,
        isDeleted: false
      });
      theLoais.push(record);
    }
    console.log(`✓ Đã tạo ${theLoais.length} thể loại sách`);

    // ============================================
    // 5. TÁC GIẢ
    // ============================================
    console.log('\n--- Đang tạo Tác giả ---');
    const tacGiaData = [
      { HoTen: 'Nguyễn Nhật Ánh', NamSinh: 1955 },
      { HoTen: 'Ngô Tất Tố', NamSinh: 1893 },
      { HoTen: 'Nam Cao', NamSinh: 1915 },
      { HoTen: 'Vũ Trọng Phụng', NamSinh: 1912 },
      { HoTen: 'Tô Hoài', NamSinh: 1920 },
      { HoTen: 'Dale Carnegie', NamSinh: 1888 },
      { HoTen: 'Paulo Coelho', NamSinh: 1947 },
      { HoTen: 'Stephen Hawking', NamSinh: 1942 },
      { HoTen: 'Yuval Noah Harari', NamSinh: 1976 },
      { HoTen: 'J.K. Rowling', NamSinh: 1965 },
      { HoTen: 'Eiichiro Oda', NamSinh: 1975 },
      { HoTen: 'Gosho Aoyama', NamSinh: 1963 },
      { HoTen: 'Nguyễn Hiến Lê', NamSinh: 1912 },
      { HoTen: 'Robert Kiyosaki', NamSinh: 1947 },
      { HoTen: 'Adam Khoo', NamSinh: 1974 }
    ];

    const tacGias = [];
    for (const tg of tacGiaData) {
      const record = await db.TacGia.create({
        MaTacGia: await generateMaTacGia(),
        HoTen: tg.HoTen,
        NamSinh: tg.NamSinh,
        isDeleted: false
      });
      tacGias.push(record);
    }
    console.log(`✓ Đã tạo ${tacGias.length} tác giả`);

    // ============================================
    // 6. KHÁCH HÀNG
    // ============================================
    console.log('\n--- Đang tạo Khách hàng ---');
    const khachHangData = [
      { HoVaTen: 'Nguyễn Văn An', GioiTinh: 'Nam', NgaySinh: '1990-03-15', SoDienThoai: '0971111111', DiaChi: '123 Nguyễn Văn Cừ, Q.5, TP.HCM', TongNo: 15000 },
      { HoVaTen: 'Trần Thị Bình', GioiTinh: 'Nữ', NgaySinh: '1988-07-22', SoDienThoai: '0972222222', DiaChi: '456 Lê Lợi, Q.1, TP.HCM', TongNo: 18000 },
      { HoVaTen: 'Lê Văn Cường', GioiTinh: 'Nam', NgaySinh: '1995-11-08', SoDienThoai: '0973333333', DiaChi: '789 Võ Thị Sáu, Q.3, TP.HCM', TongNo: 0 },
      { HoVaTen: 'Phạm Thị Dung', GioiTinh: 'Nữ', NgaySinh: '1992-04-30', SoDienThoai: '0974444444', DiaChi: '321 Hai Bà Trưng, Q.1, TP.HCM', TongNo: 5000 },
      { HoVaTen: 'Hoàng Văn Em', GioiTinh: 'Nam', NgaySinh: '1985-09-17', SoDienThoai: '0975555555', DiaChi: '654 Lý Thường Kiệt, Q.10, TP.HCM', TongNo: 12000 },
      { HoVaTen: 'Võ Thị Phương', GioiTinh: 'Nữ', NgaySinh: '1998-02-14', SoDienThoai: '0976666666', DiaChi: '987 Cách Mạng Tháng 8, Q.10, TP.HCM', TongNo: 0 },
      { HoVaTen: 'Đặng Văn Giang', GioiTinh: 'Nam', NgaySinh: '1987-06-25', SoDienThoai: '0977777777', DiaChi: '147 Trường Chinh, Q.Tân Bình, TP.HCM', TongNo: 8000 },
      { HoVaTen: 'Bùi Thị Hoa', GioiTinh: 'Nữ', NgaySinh: '1993-12-05', SoDienThoai: '0978888888', DiaChi: '258 Hoàng Văn Thụ, Q.Tân Bình, TP.HCM', TongNo: 20000 },
      { HoVaTen: 'Ngô Văn Inh', GioiTinh: 'Nam', NgaySinh: '2000-01-01', SoDienThoai: '0979999999', DiaChi: '369 Nguyễn Trãi, Q.5, TP.HCM', TongNo: 0 },
      { HoVaTen: 'Lý Thị Kim', GioiTinh: 'Nữ', NgaySinh: '1996-08-20', SoDienThoai: '0970000000', DiaChi: '741 Điện Biên Phủ, Q.Bình Thạnh, TP.HCM', TongNo: 10000 }
    ];

    const khachHangs = [];
    for (const kh of khachHangData) {
      const record = await db.KhachHang.create({
        MaKhachHang: await generateMaKhachHang(),
        HoVaTen: kh.HoVaTen,
        GioiTinh: kh.GioiTinh,
        NgaySinh: kh.NgaySinh,
        SoDienThoai: kh.SoDienThoai,
        DiaChi: kh.DiaChi,
        TongNo: kh.TongNo,
        isDeleted: false
      });
      khachHangs.push(record);
    }
    console.log(`✓ Đã tạo ${khachHangs.length} khách hàng`);

    // ============================================
    // 7. ĐẦU SÁCH VÀ SÁCH
    // ============================================
    console.log('\n--- Đang tạo Đầu sách và Sách ---');
    
    // Dữ liệu đầu sách
    const dauSachData = [
      // Văn học Việt Nam (TL001)
      { TenSach: 'Mắt Biếc', MaTheLoai: 'TL001', MoTa: 'Truyện dài nổi tiếng của Nguyễn Nhật Ánh về tình yêu tuổi học trò', TacGias: ['TG001'] },
      { TenSach: 'Tôi Thấy Hoa Vàng Trên Cỏ Xanh', MaTheLoai: 'TL001', MoTa: 'Câu chuyện về tuổi thơ và tình anh em', TacGias: ['TG001'] },
      { TenSach: 'Tắt Đèn', MaTheLoai: 'TL001', MoTa: 'Tiểu thuyết hiện thực phê phán của Ngô Tất Tố', TacGias: ['TG002'] },
      { TenSach: 'Chí Phèo', MaTheLoai: 'TL001', MoTa: 'Tác phẩm kinh điển của Nam Cao', TacGias: ['TG003'] },
      { TenSach: 'Số Đỏ', MaTheLoai: 'TL001', MoTa: 'Tiểu thuyết trào phúng của Vũ Trọng Phụng', TacGias: ['TG004'] },
      { TenSach: 'Dế Mèn Phiêu Lưu Ký', MaTheLoai: 'TL001', MoTa: 'Truyện đồng thoại nổi tiếng của Tô Hoài', TacGias: ['TG005'] },
      
      // Văn học nước ngoài (TL002)
      { TenSach: 'Nhà Giả Kim', MaTheLoai: 'TL002', MoTa: 'Tiểu thuyết triết học của Paulo Coelho', TacGias: ['TG007'] },
      { TenSach: 'Harry Potter và Hòn Đá Phù Thủy', MaTheLoai: 'TL002', MoTa: 'Tập 1 bộ truyện Harry Potter', TacGias: ['TG010'] },
      { TenSach: 'Harry Potter và Phòng Chứa Bí Mật', MaTheLoai: 'TL002', MoTa: 'Tập 2 bộ truyện Harry Potter', TacGias: ['TG010'] },
      
      // Khoa học (TL003)
      { TenSach: 'Lược Sử Thời Gian', MaTheLoai: 'TL003', MoTa: 'Sách khoa học phổ thông về vũ trụ', TacGias: ['TG008'] },
      { TenSach: 'Sapiens: Lược Sử Loài Người', MaTheLoai: 'TL003', MoTa: 'Lịch sử tiến hóa của nhân loại', TacGias: ['TG009'] },
      
      // Kinh tế (TL004)
      { TenSach: 'Cha Giàu Cha Nghèo', MaTheLoai: 'TL004', MoTa: 'Bài học về tài chính cá nhân', TacGias: ['TG014'] },
      { TenSach: 'Bí Quyết Tay Trắng Thành Triệu Phú', MaTheLoai: 'TL004', MoTa: 'Kinh nghiệm làm giàu từ Adam Khoo', TacGias: ['TG015'] },
      
      // Tâm lý - Kỹ năng sống (TL007)
      { TenSach: 'Đắc Nhân Tâm', MaTheLoai: 'TL007', MoTa: 'Nghệ thuật đối nhân xử thế', TacGias: ['TG006'] },
      { TenSach: 'Quẳng Gánh Lo Đi Và Vui Sống', MaTheLoai: 'TL007', MoTa: 'Cách sống lạc quan và tích cực', TacGias: ['TG006'] },
      
      // Thiếu nhi (TL006)
      { TenSach: 'Kính Vạn Hoa', MaTheLoai: 'TL006', MoTa: 'Bộ truyện thiếu nhi nổi tiếng', TacGias: ['TG001'] },
      
      // Truyện tranh (TL009)
      { TenSach: 'One Piece - Tập 1', MaTheLoai: 'TL009', MoTa: 'Manga hành động phiêu lưu', TacGias: ['TG011'] },
      { TenSach: 'Conan - Tập 1', MaTheLoai: 'TL009', MoTa: 'Manga trinh thám', TacGias: ['TG012'] },
      
      // Ngoại ngữ (TL010)
      { TenSach: 'Tự Học Tiếng Anh Cấp Tốc', MaTheLoai: 'TL010', MoTa: 'Giáo trình tự học tiếng Anh', TacGias: ['TG013'] },
      { TenSach: 'Ngữ Pháp Tiếng Nhật Sơ Cấp', MaTheLoai: 'TL010', MoTa: 'Giáo trình ngữ pháp N5-N4', TacGias: ['TG013'] }
    ];

    const dauSachs = [];
    const sachs = [];
    
    for (const ds of dauSachData) {
      const maDauSach = await generateMaDauSach();
      
      // Tạo đầu sách
      const dauSach = await db.DauSach.create({
        MaDauSach: maDauSach,
        TenSach: ds.TenSach,
        MaTheLoai: ds.MaTheLoai,
        MoTa: ds.MoTa,
        isDeleted: false
      });
      dauSachs.push(dauSach);

      // Liên kết với tác giả
      for (const maTacGia of ds.TacGias) {
        await db.CT_TacGia.create({
          MaDauSach: maDauSach,
          MaTacGia: maTacGia
        });
      }

      // Tạo các phiên bản sách (1-3 phiên bản cho mỗi đầu sách)
      const nhaXBs = ['NXB Trẻ', 'NXB Kim Đồng', 'NXB Văn Học', 'NXB Tổng Hợp', 'NXB Giáo Dục'];
      const soPhienBan = Math.floor(Math.random() * 2) + 1; // 1-2 phiên bản
      
      for (let i = 0; i < soPhienBan; i++) {
        const maSach = await generateMaSach();
        const sach = await db.Sach.create({
          MaSach: maSach,
          MaDauSach: maDauSach,
          NhaXB: nhaXBs[Math.floor(Math.random() * nhaXBs.length)],
          NamXB: 2019 + Math.floor(Math.random() * 6), // 2019-2024
          SoLuongTon: 50 + Math.floor(Math.random() * 200), // 50-250 (< 300 để thỏa SoLuongTonToiDaTruocKhiNhap)
          isDeleted: false
        });
        sachs.push(sach);
      }
    }
    console.log(`✓ Đã tạo ${dauSachs.length} đầu sách và ${sachs.length} sách`);

    // ============================================
    // 8. PHIẾU NHẬP SÁCH (tuân thủ quy định >= 150)
    // ============================================
    console.log('\n--- Đang tạo Phiếu nhập sách ---');
    
    const phieuNhaps = [];
    const ctPNSs = [];
    
    // Tạo 5 phiếu nhập trong năm 2024-2025
    const ngayNhapList = [
      '2024-06-15', '2024-08-20', '2024-10-10', '2024-12-01', '2025-01-05'
    ];

    for (let i = 0; i < ngayNhapList.length; i++) {
      const maPhieuNhap = await generateMaPhieuNhap();
      
      // Chọn ngẫu nhiên 3-5 sách để nhập
      const soSachNhap = 3 + Math.floor(Math.random() * 3);
      const sachNhapIndexes = [];
      while (sachNhapIndexes.length < soSachNhap && sachNhapIndexes.length < sachs.length) {
        const idx = Math.floor(Math.random() * sachs.length);
        if (!sachNhapIndexes.includes(idx)) {
          sachNhapIndexes.push(idx);
        }
      }

      let tongTien = 0;
      const chiTietList = [];

      for (const idx of sachNhapIndexes) {
        const sach = sachs[idx];
        const soLuong = 150 + Math.floor(Math.random() * 100); // 150-250 (tuân thủ SoLuongNhapToiThieu >= 150)
        const donGiaNhap = 30000 + Math.floor(Math.random() * 70000); // 30,000 - 100,000
        const donGiaBan = Math.round(donGiaNhap * 1.05); // Lãi 5% (theo TiLeTinhDonGiaBan = 1.05)
        const thanhTien = soLuong * donGiaNhap;
        
        tongTien += thanhTien;
        
        chiTietList.push({
          MaPhieuNhap: maPhieuNhap,
          MaSach: sach.MaSach,
          SoLuong: soLuong,
          DonGiaNhap: donGiaNhap,
          DonGiaBan: donGiaBan,
          ThanhTien: thanhTien
        });

        // Cập nhật số lượng tồn
        await sach.update({
          SoLuongTon: sach.SoLuongTon + soLuong
        });
      }

      // Tạo phiếu nhập
      const phieuNhap = await db.PhieuNhapSach.create({
        MaPhieuNhap: maPhieuNhap,
        NgayNhapPhieu: new Date(ngayNhapList[i]),
        TongTien: tongTien,
        MaNhanVien: nvThuKho.MaNhanVien,
        isDeleted: false
      });
      phieuNhaps.push(phieuNhap);

      // Tạo chi tiết phiếu nhập
      for (const ct of chiTietList) {
        await db.CT_PNS.create(ct);
        ctPNSs.push(ct);
      }
    }
    console.log(`✓ Đã tạo ${phieuNhaps.length} phiếu nhập với ${ctPNSs.length} chi tiết`);

    // ============================================
    // 9. HÓA ĐƠN BÁN HÀNG
    // ============================================
    console.log('\n--- Đang tạo Hóa đơn bán hàng ---');

    const hoaDons = [];
    
    // Tạo 15 hóa đơn trong năm 2024-2025
    const ngayBanList = [
      '2024-06-20', '2024-07-05', '2024-07-15', '2024-08-25', '2024-09-10',
      '2024-10-15', '2024-10-28', '2024-11-05', '2024-11-20', '2024-12-10',
      '2024-12-25', '2025-01-10', '2025-01-15', '2025-01-20', '2025-01-25'
    ];

    for (let i = 0; i < ngayBanList.length; i++) {
      const maHoaDon = await generateMaHoaDon();
      const khachHang = khachHangs[Math.floor(Math.random() * khachHangs.length)];
      const nhanVien = Math.random() > 0.5 ? nvBanHang1 : nvBanHang2;
      
      // Chọn ngẫu nhiên 1-3 sách để bán
      const soSachBan = 1 + Math.floor(Math.random() * 3);
      const sachBanIndexes = [];
      while (sachBanIndexes.length < soSachBan && sachBanIndexes.length < sachs.length) {
        const idx = Math.floor(Math.random() * sachs.length);
        if (!sachBanIndexes.includes(idx)) {
          sachBanIndexes.push(idx);
        }
      }

      let tongTien = 0;
      const chiTietList = [];

      for (const idx of sachBanIndexes) {
        const sach = sachs[idx];
        
        // Lấy giá bán từ phiếu nhập gần nhất
        const ctPNS = await db.CT_PNS.findOne({
          where: { MaSach: sach.MaSach },
          order: [['MaPhieuNhap', 'DESC']]
        });
        
        const donGiaBan = ctPNS ? parseFloat(ctPNS.DonGiaBan) : 50000;
        
        // Số lượng bán (đảm bảo sau khi bán còn >= 20 theo quy định)
        const soLuongCoTheBan = Math.max(0, sach.SoLuongTon - 20);
        if (soLuongCoTheBan <= 0) continue;
        
        const soLuongBan = Math.min(1 + Math.floor(Math.random() * 5), soLuongCoTheBan); // 1-5 quyển
        const thanhTien = soLuongBan * donGiaBan;
        
        tongTien += thanhTien;
        
        chiTietList.push({
          MaHoaDon: maHoaDon,
          MaSach: sach.MaSach,
          SoLuongBan: soLuongBan,
          DonGiaBan: donGiaBan,
          ThanhTien: thanhTien
        });

        // Cập nhật số lượng tồn
        await sach.update({
          SoLuongTon: sach.SoLuongTon - soLuongBan
        });
      }

      if (chiTietList.length === 0) continue;

      // Tính số tiền trả (có thể trả đủ hoặc nợ)
      const traHet = Math.random() > 0.3; // 70% trả hết
      const soTienTra = traHet ? tongTien : Math.round(tongTien * (0.5 + Math.random() * 0.4)); // Trả 50-90%
      const conLai = tongTien - soTienTra;

      // Tạo hóa đơn
      const hoaDon = await db.HoaDon.create({
        MaHoaDon: maHoaDon,
        NgayLapHoaDon: new Date(ngayBanList[i]),
        MaKhachHang: khachHang.MaKhachHang,
        MaNhanVien: nhanVien.MaNhanVien,
        TongTien: tongTien,
        SoTienTra: soTienTra,
        ConLai: conLai,
        isDeleted: false
      });
      hoaDons.push(hoaDon);

      // Tạo chi tiết hóa đơn
      for (const ct of chiTietList) {
        await db.CT_HD.create(ct);
      }

      // Cập nhật nợ khách hàng (tuân thủ quy định tối đa 20000)
      if (conLai > 0) {
        const noMoi = Math.min(parseFloat(khachHang.TongNo) + conLai, 20000);
        await khachHang.update({ TongNo: noMoi });
      }
    }
    console.log(`✓ Đã tạo ${hoaDons.length} hóa đơn bán hàng`);

    // ============================================
    // 10. PHIẾU THU TIỀN
    // ============================================
    console.log('\n--- Đang tạo Phiếu thu tiền ---');

    const phieuThus = [];
    
    // Tạo phiếu thu cho các khách hàng có nợ
    for (const kh of khachHangs) {
      if (parseFloat(kh.TongNo) > 0) {
        const maPhieuThu = await generateMaPhieuThu();
        const soTienThu = Math.min(
          Math.round(parseFloat(kh.TongNo) * (0.3 + Math.random() * 0.5)), // Thu 30-80% nợ
          parseFloat(kh.TongNo) // Không được thu quá số tiền nợ
        );

        if (soTienThu > 0) {
          const phieuThu = await db.PhieuThuTien.create({
            MaPhieuThu: maPhieuThu,
            MaKhachHang: kh.MaKhachHang,
            MaNhanVien: nvBanHang1.MaNhanVien,
            NgayThuTien: new Date('2025-01-28'),
            SoTienThu: soTienThu,
            isDeleted: false
          });
          phieuThus.push(phieuThu);

          // Cập nhật nợ khách hàng
          await kh.update({
            TongNo: parseFloat(kh.TongNo) - soTienThu
          });
        }
      }
    }
    console.log(`✓ Đã tạo ${phieuThus.length} phiếu thu tiền`);

    // ============================================
    // 11. LOẠI LÝ DO KIỂM KÊ
    // ============================================
    console.log('\n--- Đang tạo Loại lý do kiểm kê ---');
    
    const loaiLyDoData = [
      { TenLyDo: 'Hư hỏng', MoTa: 'Sách bị hư hỏng do bảo quản, vận chuyển' },
      { TenLyDo: 'Mất', MoTa: 'Sách bị mất, thất lạc' },
      { TenLyDo: 'Thừa', MoTa: 'Số lượng thực tế nhiều hơn hệ thống (nhập thiếu đơn)' },
      { TenLyDo: 'Nhập sai', MoTa: 'Nhập sai số lượng ban đầu' },
      { TenLyDo: 'Lỗi in ấn', MoTa: 'Sách bị lỗi in từ nhà xuất bản' },
      { TenLyDo: 'Hết hạn', MoTa: 'Sách cũ, không còn giá trị sử dụng' },
      { TenLyDo: 'Khác', MoTa: 'Lý do khác không thuộc các loại trên' }
    ];

    const loaiLyDos = [];
    for (const ll of loaiLyDoData) {
      const record = await db.LoaiLyDoKiemKe.create({
        TenLyDo: ll.TenLyDo,
        MoTa: ll.MoTa,
        isDeleted: false
      });
      loaiLyDos.push(record);
    }
    console.log(`✓ Đã tạo ${loaiLyDos.length} loại lý do kiểm kê`);

    // ============================================
    // 12. PHIẾU KIỂM KÊ
    // ============================================
    console.log('\n--- Đang tạo Phiếu kiểm kê ---');

    const phieuKiemKes = [];
    const chiTietKiemKes = [];
    const ctLyDoKiemKes = [];

    // Tạo 3 phiếu kiểm kê trong năm 2024-2025
    const ngayKiemList = [
      { ngay: '2024-07-01', ghiChu: 'Kiểm kê định kỳ quý 2/2024' },
      { ngay: '2024-10-15', ghiChu: 'Kiểm kê định kỳ quý 3/2024' },
      { ngay: '2025-01-05', ghiChu: 'Kiểm kê đầu năm 2025' }
    ];

    for (let i = 0; i < ngayKiemList.length; i++) {
      const maPhieuKiem = await generateMaPhieuKiem();
      
      // Tạo phiếu kiểm kê
      const phieuKiem = await db.PhieuKiemKe.create({
        MaPhieuKiem: maPhieuKiem,
        NgayKiem: new Date(ngayKiemList[i].ngay),
        MaNhanVien: nvThuKho.MaNhanVien,
        GhiChu: ngayKiemList[i].ghiChu,
        isDeleted: false
      });
      phieuKiemKes.push(phieuKiem);

      // Chọn ngẫu nhiên 4-8 sách để kiểm kê
      const soSachKiem = 4 + Math.floor(Math.random() * 5);
      const sachKiemIndexes = [];
      while (sachKiemIndexes.length < soSachKiem && sachKiemIndexes.length < sachs.length) {
        const idx = Math.floor(Math.random() * sachs.length);
        if (!sachKiemIndexes.includes(idx)) {
          sachKiemIndexes.push(idx);
        }
      }

      for (const idx of sachKiemIndexes) {
        const sach = sachs[idx];
        const soLuongHeThong = sach.SoLuongTon;
        
        // Ngẫu nhiên tạo sự lệch (80% khớp, 20% lệch)
        let soLuongThucTe = soLuongHeThong;
        const coLech = Math.random() > 0.8;
        
        if (coLech) {
          // Lệch từ -5 đến +3 (thiếu nhiều hơn thừa)
          const soLech = Math.floor(Math.random() * 9) - 5;
          soLuongThucTe = Math.max(0, soLuongHeThong + soLech);
        }

        // Tạo chi tiết kiểm kê
        await db.ChiTietKiemKe.create({
          MaPhieuKiem: maPhieuKiem,
          MaSach: sach.MaSach,
          SoLuongHeThong: soLuongHeThong,
          SoLuongThucTe: soLuongThucTe
        });
        chiTietKiemKes.push({ MaPhieuKiem: maPhieuKiem, MaSach: sach.MaSach });

        // Nếu có sự lệch, tạo lý do kiểm kê
        const chenhLech = soLuongThucTe - soLuongHeThong;
        if (chenhLech !== 0) {
          let maLyDo;
          let lyDoKhac = null;
          
          if (chenhLech < 0) {
            // Thiếu hàng: có thể do mất (MaLyDo: 2) hoặc hư hỏng (MaLyDo: 1)
            maLyDo = Math.random() > 0.5 ? loaiLyDos[0].MaLyDo : loaiLyDos[1].MaLyDo;
          } else {
            // Thừa hàng: có thể do nhập sai (MaLyDo: 4) hoặc thừa (MaLyDo: 3)
            maLyDo = Math.random() > 0.5 ? loaiLyDos[2].MaLyDo : loaiLyDos[3].MaLyDo;
          }

          await db.CT_LyDoKiemKe.create({
            MaPhieuKiem: maPhieuKiem,
            MaSach: sach.MaSach,
            MaLyDo: maLyDo,
            LyDoKhac: lyDoKhac,
            SoLuong: Math.abs(chenhLech)
          });
          ctLyDoKiemKes.push({ MaPhieuKiem: maPhieuKiem, MaSach: sach.MaSach, MaLyDo: maLyDo });

          // Cập nhật số lượng tồn thực tế (điều chỉnh kho)
          await sach.update({
            SoLuongTon: soLuongThucTe
          });
        }
      }
    }
    console.log(`✓ Đã tạo ${phieuKiemKes.length} phiếu kiểm kê với ${chiTietKiemKes.length} chi tiết`);
    console.log(`✓ Đã tạo ${ctLyDoKiemKes.length} lý do lệch kho`);

    // ============================================
    // KẾT THÚC
    // ============================================
    console.log('\n========================================');
    console.log('   TẠO DỮ LIỆU MẪU HOÀN TẤT!');
    console.log('========================================');
    console.log('\nTÓM TẮT DỮ LIỆU:');
    console.log(`  - Tham số hệ thống: 7`);
    console.log(`  - Vai trò: 4 (Admin, Chủ cửa hàng, Nhân viên, Thủ kho)`);
    console.log(`  - Quyền: ${quyenList.length}`);
    console.log(`  - Nhân viên: 5`);
    console.log(`  - Thể loại: ${theLoais.length}`);
    console.log(`  - Tác giả: ${tacGias.length}`);
    console.log(`  - Khách hàng: ${khachHangs.length}`);
    console.log(`  - Đầu sách: ${dauSachs.length}`);
    console.log(`  - Sách: ${sachs.length}`);
    console.log(`  - Phiếu nhập: ${phieuNhaps.length}`);
    console.log(`  - Hóa đơn: ${hoaDons.length}`);
    console.log(`  - Phiếu thu: ${phieuThus.length}`);
    console.log(`  - Loại lý do kiểm kê: ${loaiLyDos.length}`);
    console.log(`  - Phiếu kiểm kê: ${phieuKiemKes.length}`);
    console.log(`  - Chi tiết kiểm kê: ${chiTietKiemKes.length}`);
    console.log(`  - Lý do lệch kho: ${ctLyDoKiemKes.length}`);
    console.log('\nTÀI KHOẢN ĐĂNG NHẬP (Password: 123):');
    console.log('  - Admin:        admin');
    console.log('  - Chủ cửa hàng: chucuahang');
    console.log('  - Thủ kho:      thukho');
    console.log('  - Nhân viên:    nhanvien1, nhanvien2');
    console.log('\nQUY ĐỊNH HỆ THỐNG:');
    console.log('  - Số lượng nhập tối thiểu: 150 cuốn');
    console.log('  - Số lượng tồn tối đa trước khi nhập: 300 cuốn');
    console.log('  - Số lượng tồn tối thiểu sau khi bán: 20 cuốn');
    console.log('  - Số tiền nợ tối đa: 20,000 VNĐ');
    console.log('  - Không được thu quá số tiền nợ (ApDungQDKiemTraTienNo = 0)');
    console.log('  - Tuổi tối thiểu nhân viên: 18');
    console.log('  - Tỉ lệ tính đơn giá bán: 1.05 (lãi 5%)');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ LỖI khi tạo dữ liệu mẫu:', error);
    // Bật lại foreign key check nếu có lỗi
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { raw: true });
    throw error;
  }
};

// Chạy script
if (require.main === module) {
  seedSampleData()
    .then(() => {
      console.log('Script hoàn tất.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Script thất bại:', err);
      process.exit(1);
    });
}

module.exports = seedSampleData;
