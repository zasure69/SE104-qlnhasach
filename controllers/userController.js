// controllers/userController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// --- SỬA LẠI IMPORT ---
// Import tất cả models và sequelize từ file trung tâm
const db = require('../models'); 
// Giờ đây, 'db.User' là model User, 'db.sequelize' là instance sequelize
// --- KẾT THÚC SỬA ---


// =============================================================
// HÀM HELPER: TẠO MÃ NHÂN VIÊN MỚI
// =============================================================
async function generateNewEmployeeId() {
  const prefix = 'NV';
  const paddingLength = 3; 

  // SỬA: Dùng db.User và db.sequelize
  const lastEmployee = await db.User.findOne({
    order: [
      [db.sequelize.literal(`CAST(SUBSTRING(MaNhanVien, ${prefix.length + 1}) AS UNSIGNED)`), 'DESC']
    ],
    attributes: ['MaNhanVien'], 
    raw: true
  });

  let lastIdNumber = 0;
  if (lastEmployee && lastEmployee.MaNhanVien) {
    try {
      const numericPart = lastEmployee.MaNhanVien.substring(prefix.length);
      lastIdNumber = parseInt(numericPart, 10);
    } catch (error) {
      console.error("Lỗi khi phân tích Mã Nhân Viên cuối cùng:", error);
    }
  }

  const newIdNumber = lastIdNumber + 1; 
  const newMaNhanVien = prefix + String(newIdNumber).padStart(paddingLength, '0');
  return newMaNhanVien;
}

// === HÀM RENDER TRANG ===
const getLoginPage = (req, res) => {
  try {
    // --- SỬA: KIỂM TRA COOKIE ---
    const token = req.cookies.authToken;

    if (!token) {
      return res.render('login', { error: null });
    }

    jwt.verify(token, process.env.JWT_SECRET_KEY, (err, user) => {
      if (err) {
        res.clearCookie('authToken');
        return res.render('login', { error: null });
      }
      
      // Sửa /dashboard thành đường dẫn trang chính của bạn (vd: /dashboard/books)
      return res.redirect('/dashboard'); 
    });
    // --- KẾT THÚC SỬA ---
  } catch (err) {
    res.status(500).send('Lỗi server');
  }
};

// =============================================================
// HÀM ĐĂNG KÝ 
// =============================================================
const register = async (req, res) => {
  try {
    const { username, password, hoTen, soDienThoai, chucVu, ngayNhanViec } = req.body;
    const newMaNhanVien = await generateNewEmployeeId();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // SỬA: Dùng db.User
    const newUser = await db.User.create({
      MaNhanVien: newMaNhanVien,
      HoTen: hoTen,
      SoDienThoai: soDienThoai,
      ChucVu: chucVu,
      Username: username,
      Password: hashedPassword,
      NgayNhanViec: ngayNhanViec || new Date()
    });

    res.status(201).json({ message: "Tạo tài khoản thành công!", userId: newUser.MaNhanVien });

  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Username hoặc SĐT đã tồn tại' });
    }
    console.error(err);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
};

// === HÀM ĐĂNG NHẬP ===
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập username và password' });
    }

    // SỬA: Dùng db.User
    const user = await db.User.findOne({ 
      where: { Username: username } 
    });

    if (!user) {
      return res.status(401).json({ error: 'Username hoặc password không đúng' });
    }

    const isMatch = await bcrypt.compare(password, user.Password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Username hoặc password không đúng' });
    }

    const payload = {
      id: user.MaNhanVien,
      username: user.Username,
      role: user.ChucVu
    };
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET_KEY,
      { expiresIn: '24h' }
    );

    // SỬA: Gửi token qua Cookie
    res.cookie('authToken', token, {
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 giờ
    });

    res.status(200).json({
      message: 'Đăng nhập thành công!'
    });

  } catch (err) {
    console.error('Lỗi khi đăng nhập:', err);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
};

// --- THÊM: HÀM ĐĂNG XUẤT ---
const logout = (req, res) => {
    res.clearCookie('authToken'); // Xóa cookie
    res.redirect('/login'); // Chuyển hướng về trang login
};

module.exports = {
  getLoginPage,
  register,
  login,
  logout
};