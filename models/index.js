const sequelize = require("../config/db");

// Import tất cả models
const NhanVien = require("./NhanVien");
const ThamSo = require("./ThamSo");
const TheLoai = require("./TheLoai");
const TacGia = require("./TacGia");
const KhachHang = require("./KhachHang");
const DauSach = require("./DauSach");
const Sach = require("./Sach");
const CT_TacGia = require("./CT_TacGia");
const PhieuNhapSach = require("./PhieuNhapSach");
const CT_PNS = require("./CT_PNS");
const HoaDon = require("./HoaDon");
const CT_HD = require("./CT_HD");
const PhieuThuTien = require("./PhieuThuTien");
const BaoCaoTon = require("./BaoCaoTon");
const BaoCaoCongNo = require("./BaoCaoCongNo");
const BaoCaoDoanhThu = require("./BaoCaoDoanhThu");
const PhieuKiemKe = require("./PhieuKiemKe");
const ChiTietKiemKe = require("./ChiTietKiemKe");
const LoaiLyDoKiemKe = require("./LoaiLyDoKiemKe");
const CT_LyDoKiemKe = require("./CT_LyDoKiemKe");

// 1. NhanVien Relationships
NhanVien.hasMany(PhieuNhapSach, {
  foreignKey: "MaNhanVien",
  onDelete: "RESTRICT",
});
PhieuNhapSach.belongsTo(NhanVien, { foreignKey: "MaNhanVien" });

NhanVien.hasMany(HoaDon, { foreignKey: "MaNhanVien", onDelete: "RESTRICT" });
HoaDon.belongsTo(NhanVien, { foreignKey: "MaNhanVien" });

NhanVien.hasMany(PhieuThuTien, {
  foreignKey: "MaNhanVien",
  onDelete: "RESTRICT",
});
PhieuThuTien.belongsTo(NhanVien, { foreignKey: "MaNhanVien" });

// 2. TheLoai Relationships
TheLoai.hasMany(DauSach, { foreignKey: "MaTheLoai" });
DauSach.belongsTo(TheLoai, { foreignKey: "MaTheLoai" });

TheLoai.hasMany(BaoCaoDoanhThu, { foreignKey: "MaTheLoai" });
BaoCaoDoanhThu.belongsTo(TheLoai, { foreignKey: "MaTheLoai" });

// 3. KhachHang Relationships
KhachHang.hasMany(HoaDon, { foreignKey: "MaKhachHang", onDelete: "RESTRICT" });
HoaDon.belongsTo(KhachHang, { foreignKey: "MaKhachHang" });

KhachHang.hasMany(PhieuThuTien, {
  foreignKey: "MaKhachHang",
  onDelete: "RESTRICT",
});
PhieuThuTien.belongsTo(KhachHang, { foreignKey: "MaKhachHang" });

KhachHang.hasMany(BaoCaoCongNo, { foreignKey: "MaKhachHang" });
BaoCaoCongNo.belongsTo(KhachHang, { foreignKey: "MaKhachHang" });

// 4. DauSach Relationships
DauSach.hasMany(Sach, { foreignKey: "MaDauSach" });
Sach.belongsTo(DauSach, { foreignKey: "MaDauSach" });

// 5. DauSach <-> TacGia (Many-to-Many)
DauSach.belongsToMany(TacGia, {
  through: CT_TacGia,
  foreignKey: "MaDauSach",
  as: "TacGias", // Đặt alias rõ ràng
});
TacGia.belongsToMany(DauSach, {
  through: CT_TacGia,
  foreignKey: "MaTacGia",
  as: "DauSachs", // Đặt alias rõ ràng
});

// 5a. CT_TacGia <-> DauSach và TacGia (One-to-Many để hỗ trợ include trực tiếp)
CT_TacGia.belongsTo(DauSach, { foreignKey: "MaDauSach" });
DauSach.hasMany(CT_TacGia, { foreignKey: "MaDauSach" });
CT_TacGia.belongsTo(TacGia, { foreignKey: "MaTacGia" });
TacGia.hasMany(CT_TacGia, { foreignKey: "MaTacGia" });

// 6. Sach Relationships
Sach.hasMany(BaoCaoTon, { foreignKey: "MaSach" });
BaoCaoTon.belongsTo(Sach, { foreignKey: "MaSach" });

// 7. Sach <-> PhieuNhapSach (Many-to-Many with attributes)
Sach.belongsToMany(PhieuNhapSach, { through: CT_PNS, foreignKey: "MaSach" });
PhieuNhapSach.belongsToMany(Sach, {
  through: CT_PNS,
  foreignKey: "MaPhieuNhap",
});

// 7a. PhieuNhapSach <-> CT_PNS (One-to-Many)
PhieuNhapSach.hasMany(CT_PNS, { foreignKey: "MaPhieuNhap", as: "ChiTiet" });
CT_PNS.belongsTo(PhieuNhapSach, { foreignKey: "MaPhieuNhap" });

// 7b. CT_PNS <-> Sach
CT_PNS.belongsTo(Sach, { foreignKey: "MaSach" });
Sach.hasMany(CT_PNS, { foreignKey: "MaSach" });

// 8. Sach <-> HoaDon (Many-to-Many with attributes)
Sach.belongsToMany(HoaDon, { through: CT_HD, foreignKey: "MaSach" });
HoaDon.belongsToMany(Sach, { through: CT_HD, foreignKey: "MaHoaDon" });

//9. HoaDon <-> CT_HD
HoaDon.hasMany(CT_HD, { foreignKey: "MaHoaDon" });
CT_HD.belongsTo(HoaDon, { foreignKey: "MaHoaDon" });

//10. Sach <-> Ct_HD
Sach.hasMany(CT_HD, { foreignKey: "MaSach" });
CT_HD.belongsTo(Sach, { foreignKey: "MaSach" });

// 11. PhieuKiemKe Relationships
NhanVien.hasMany(PhieuKiemKe, {
  foreignKey: "MaNhanVien",
  onDelete: "RESTRICT",
});
PhieuKiemKe.belongsTo(NhanVien, { foreignKey: "MaNhanVien" });

// 12. PhieuKiemKe <-> ChiTietKiemKe (One-to-Many)
PhieuKiemKe.hasMany(ChiTietKiemKe, {
  foreignKey: "MaPhieuKiem",
  as: "ChiTiet",
});
ChiTietKiemKe.belongsTo(PhieuKiemKe, { foreignKey: "MaPhieuKiem" });

// 13. Sach <-> ChiTietKiemKe
Sach.hasMany(ChiTietKiemKe, { foreignKey: "MaSach" });
ChiTietKiemKe.belongsTo(Sach, { foreignKey: "MaSach" });

// 14. CT_LyDoKiemKe - Chi tiết lý do kiểm kê (nhiều lý do cho 1 sách)
ChiTietKiemKe.hasMany(CT_LyDoKiemKe, {
  foreignKey: "MaPhieuKiem",
  sourceKey: "MaPhieuKiem",
  as: "DanhSachLyDo",
});

// Liên kết CT_LyDoKiemKe với LoaiLyDoKiemKe
LoaiLyDoKiemKe.hasMany(CT_LyDoKiemKe, { foreignKey: "MaLyDo" });
CT_LyDoKiemKe.belongsTo(LoaiLyDoKiemKe, { foreignKey: "MaLyDo" });

// Liên kết CT_LyDoKiemKe với Sach
Sach.hasMany(CT_LyDoKiemKe, { foreignKey: "MaSach" });
CT_LyDoKiemKe.belongsTo(Sach, { foreignKey: "MaSach" });

// Export tất cả models và sequelize instance
module.exports = {
  sequelize,
  NhanVien,
  ThamSo,
  TheLoai,
  TacGia,
  KhachHang,
  DauSach,
  Sach,
  CT_TacGia,
  PhieuNhapSach,
  CT_PNS,
  HoaDon,
  CT_HD,
  PhieuThuTien,
  BaoCaoTon,
  BaoCaoCongNo,
  BaoCaoDoanhThu,
  PhieuKiemKe,
  ChiTietKiemKe,
  LoaiLyDoKiemKe,
  CT_LyDoKiemKe,
};
