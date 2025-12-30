const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const LoaiLyDoKiemKe = sequelize.define(
  "LoaiLyDoKiemKe",
  {
    MaLyDo: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    TenLyDo: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    MoTa: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
  },
  {
    tableName: "LOAILYDO_KIEMKE",
    timestamps: false,
  }
);

module.exports = LoaiLyDoKiemKe;
