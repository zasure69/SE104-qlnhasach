const sequelize = require("../config/db");

// Import tất cả models
const User = require("./User");
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

// 1. User (NHANVIEN) Relationships
User.hasMany(PhieuNhapSach, { foreignKey: "MaNhanVien" });
PhieuNhapSach.belongsTo(User, { foreignKey: "MaNhanVien" });

User.hasMany(HoaDon, { foreignKey: "MaNhanVien" });
HoaDon.belongsTo(User, { foreignKey: "MaNhanVien" });

// 2. TheLoai Relationships
TheLoai.hasMany(DauSach, { foreignKey: "MaTheLoai" });
DauSach.belongsTo(TheLoai, { foreignKey: "MaTheLoai" });

TheLoai.hasMany(BaoCaoDoanhThu, { foreignKey: "MaTheLoai" });
BaoCaoDoanhThu.belongsTo(TheLoai, { foreignKey: "MaTheLoai" });

// 3. KhachHang Relationships
KhachHang.hasMany(HoaDon, { foreignKey: "MaKhachHang" });
HoaDon.belongsTo(KhachHang, { foreignKey: "MaKhachHang" });

KhachHang.hasMany(PhieuThuTien, { foreignKey: "MaKhachHang" });
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

// Export tất cả models và sequelize instance
module.exports = {
  sequelize,
  User,
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
};
