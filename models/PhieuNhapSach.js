const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// Ánh xạ tới bảng PHIEUNHAPSACH [cite: 815]
const PhieuNhapSach = sequelize.define(
  "PhieuNhapSach",
  {
    MaPhieuNhap: {
      type: DataTypes.STRING(20),
      primaryKey: true,
      allowNull: false,
    },
    NgayNhapPhieu: {
      type: DataTypes.DATE, // DATETIME
      allowNull: false,
    },
    TongTien: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
    },
    MaNhanVien: {
      type: DataTypes.STRING(20),
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
  },
  {
    tableName: "PHIEUNHAPSACH",
    timestamps: false,
  }
);

module.exports = PhieuNhapSach;
