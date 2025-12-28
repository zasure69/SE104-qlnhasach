const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Sach = require("./Sach");
const PhieuKiemKe = require("./PhieuKiemKe");

const ChiTietKiemKe = sequelize.define(
  "ChiTietKiemKe",
  {
    MaPhieuKiem: {
      type: DataTypes.STRING(20),
      primaryKey: true,
      allowNull: false,
      references: {
        model: PhieuKiemKe,
        key: "MaPhieuKiem",
      },
    },
    MaSach: {
      type: DataTypes.STRING(15), // QUAN TRỌNG: Khớp với Sach
      primaryKey: true,
      allowNull: false,
      references: {
        model: Sach,
        key: "MaSach",
      },
    },
    SoLuongHeThong: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    SoLuongThucTe: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    LyDo: {
      type: DataTypes.TEXT,
    },
  },
  {
    tableName: "CT_KiemKe",
    timestamps: false,
  }
);

module.exports = ChiTietKiemKe;
