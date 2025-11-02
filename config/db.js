const { Sequelize } = require('sequelize');
require('dotenv').config();

// Khởi tạo một đối tượng Sequelize
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql'
  }
);

// Xuất đối tượng sequelize để các file khác có thể dùng
module.exports = sequelize;