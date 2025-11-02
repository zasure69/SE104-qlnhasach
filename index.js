const express = require('express');
const path = require('path');
const sequelize = require('./config/db'); // Import kết nối sequelize
//const User = require('./models/User'); // Import model User (ví dụ)

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware để đọc JSON
app.use(express.json());
// --- CẤU HÌNH TEMPLATE ENGINE ---
// 1. Đặt 'view engine' là 'ejs'
app.set('view engine', 'ejs');
// 2. Chỉ cho Express biết thư mục 'views' nằm ở đâu
app.set('views', path.join(__dirname, 'views'));

// --- Định nghĩa Routes ---

// // GET: Lấy tất cả users
// app.get('/users', async (req, res) => {
//   try {
//     // Dùng method .findAll() của Sequelize
//     const users = await User.findAll();
//     res.status(200).json(users);
//   } catch (err) {
//     console.error('Lỗi khi lấy users:', err);
//     res.status(500).json({ error: 'Lỗi server nội bộ' });
//   }
// });

// // POST: Tạo user mới
// app.post('/users', async (req, res) => {
//   try {
//     const { name, email } = req.body;

//     if (!name || !email) {
//       return res.status(400).json({ error: 'Vui lòng cung cấp name và email' });
//     }

//     // Dùng method .create() của Sequelize
//     const newUser = await User.create({ name, email });
//     res.status(201).json(newUser);
//   } catch (err) {
//     // Xử lý lỗi nếu email bị trùng (lỗi unique constraint)
//     if (err.name === 'SequelizeUniqueConstraintError') {
//       return res.status(409).json({ error: 'Email đã tồn tại' });
//     }
//     console.error('Lỗi khi tạo user:', err);
//     res.status(500).json({ error: 'Lỗi server nội bộ' });
//   }
// });

// --- Khởi động Server và Đồng bộ Database ---

// Tạo một hàm async để khởi động
const startServer = async () => {
  try {
    // 1. Xác thực kết nối database
    await sequelize.authenticate();
    console.log('Kết nối MySQL thành công.');

    // 2. Đồng bộ models (tạo bảng nếu chưa có)
    // { force: false } (mặc định) sẽ không xóa bảng nếu đã tồn tại
    // { force: true } sẽ xóa bảng cũ và tạo lại (mất dữ liệu)
    await sequelize.sync({ force: false }); 
    console.log('Bảng đã được đồng bộ.');

    // 3. Khởi động Express server
    app.listen(PORT, () => {
      console.log(`Server đang chạy tại http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Lỗi không thể khởi động server:', err);
  }
};

// Gọi hàm để bắt đầu
startServer();