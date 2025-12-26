const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// Ánh xạ tới bảng KHACHHANG [cite: 821, 770]
const KhachHang = sequelize.define(
  "KhachHang",
  {
    MaKhachHang: {
      type: DataTypes.STRING(15),
      primaryKey: true,
      allowNull: false,
    },
    HoVaTen: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    GioiTinh: {
      type: DataTypes.STRING(10),
    },
    NgaySinh: {
      type: DataTypes.DATEONLY,
    },
    SoDienThoai: {
      type: DataTypes.STRING(15),
      unique: true,
    },
    DiaChi: {
      type: DataTypes.STRING(255),
    },
    TongNo: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0,
    },
  },
  {
    tableName: "KHACHHANG",
    timestamps: false,
  }
);

module.exports = KhachHang;
