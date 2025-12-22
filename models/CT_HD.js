const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// Ánh xạ tới bảng CT_HD [cite: 827]
const CT_HD = sequelize.define(
  "CT_HD",
  {
    MaHoaDon: {
      type: DataTypes.STRING(20),
      primaryKey: true,
      allowNull: false,
    },
    MaSach: {
      type: DataTypes.STRING(15),
      primaryKey: true, // Sửa: Thêm PK
      allowNull: false,
    },
    SoLuongBan: {
      type: DataTypes.INTEGER,
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
    tableName: "CT_HD",
    timestamps: false,
  }
);

module.exports = CT_HD;
