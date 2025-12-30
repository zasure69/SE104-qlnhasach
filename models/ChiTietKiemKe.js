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
      type: DataTypes.STRING(15),
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
  },
  {
    tableName: "CT_KIEMKE",
    timestamps: false,
  }
);

module.exports = ChiTietKiemKe;
