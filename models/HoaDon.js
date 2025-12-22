const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// Ánh xạ tới bảng HOADON [cite: 824]
const HoaDon = sequelize.define(
  "HoaDon",
  {
    MaHoaDon: {
      type: DataTypes.STRING(20),
      primaryKey: true,
      allowNull: false,
    },
    NgayLapHoaDon: {
      type: DataTypes.DATE, // DATETIME
      allowNull: false,
    },
    MaKhachHang: {
      type: DataTypes.STRING(15),
    },
    MaNhanVien: {
      type: DataTypes.STRING(20),
    },
    TongTien: {
      type: DataTypes.DECIMAL(18, 0),
      allowNull: false,
    },
    SoTienTra: {
      type: DataTypes.DECIMAL(18, 0),
      allowNull: false,
    },
    ConLai: {
      type: DataTypes.DECIMAL(18, 0),
      allowNull: false,
    },
  },
  {
    tableName: "HOADON",
    timestamps: false,
  }
);

module.exports = HoaDon;
