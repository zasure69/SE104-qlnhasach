const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const NhanVien = require("./NhanVien");

const PhieuKiemKe = sequelize.define(
  "PhieuKiemKe",
  {
    MaPhieuKiem: {
      type: DataTypes.STRING(20), // Tự đặt độ dài cho mã phiếu
      primaryKey: true,
      allowNull: false,
    },
    NgayKiem: {
      type: DataTypes.DATE,
    },
    MaNhanVien: {
      type: DataTypes.STRING(20), // Khớp với NhanVien
      allowNull: false,
      references: {
        model: NhanVien,
        key: "MaNhanVien",
      },
    },
    GhiChu: {
      type: DataTypes.TEXT, // Hoặc STRING(255) tùy ý
    },
    isDeleted: {
      type: DataTypes.BOOLEAN, // Sequelize dùng BOOLEAN
      defaultValue: false,
      allowNull: false,
    },
  },
  {
    tableName: "PHIEUKIEMKE",
    timestamps: false,
  }
);

module.exports = PhieuKiemKe;
