const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// Ánh xạ tới bảng CT_PNS
const CT_PNS = sequelize.define(
  "CT_PNS",
  {
    MaPhieuNhap: {
      type: DataTypes.STRING(20),
      primaryKey: true,
      allowNull: false,
    },
    MaSach: {
      type: DataTypes.STRING(15),
      primaryKey: true,
      allowNull: false,
    },
    SoLuong: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    DonGiaNhap: {
      type: DataTypes.DECIMAL(18, 0),
      allowNull: false,
    },
    DonGiaBan: {
      type: DataTypes.DECIMAL(18, 0),
      allowNull: false,
    },
    ThanhTien: {
      type: DataTypes.DECIMAL(18, 0),
      allowNull: false,
    },
  },
  {
    tableName: "CT_PNS",
    timestamps: false,
  }
);

module.exports = CT_PNS;
