// controllers/employeeController.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// --- SỬA LẠI IMPORT ---
// Import tất cả models và sequelize từ file trung tâm
const db = require("../models");
// Giờ đây, 'db.NhanVien' là model NhanVien, 'db.sequelize' là instance sequelize
// --- KẾT THÚC SỬa ---

// =============================================================
// HÀM HELPER: TẠO MÃ NHÂN VIÊN MỚI
// =============================================================
async function generateNewEmployeeId() {
  const prefix = "NV";
  const paddingLength = 3;

  // SỬa: Dùng db.NhanVien và db.sequelize
  const lastEmployee = await db.NhanVien.findOne({
    order: [
      [
        db.sequelize.literal(
          `CAST(SUBSTRING(MaNhanVien, ${prefix.length + 1}) AS UNSIGNED)`
        ),
        "DESC",
      ],
    ],
    attributes: ["MaNhanVien"],
    raw: true,
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
  const newMaNhanVien =
    prefix + String(newIdNumber).padStart(paddingLength, "0");
  return newMaNhanVien;
}

// === HÀM RENDER TRANG ===
const getLoginPage = (req, res) => {
  try {
    // --- SỬA: KIỂM TRA COOKIE ---
    const token = req.cookies.authToken;

    if (!token) {
      return res.render("login", { error: null });
    }

    jwt.verify(token, process.env.JWT_SECRET_KEY, (err, user) => {
      if (err) {
        res.clearCookie("authToken");
        return res.render("login", { error: null });
      }

      // Sửa /dashboard thành đường dẫn trang chính của bạn (vd: /dashboard/books)
      return res.redirect("/dashboard");
    });
    // --- KẾT THÚC SỬA ---
  } catch (err) {
    res.status(500).send("Lỗi server");
  }
};

// =============================================================
// HÀM ĐĂNG KÝ
// =============================================================
const registerEmployee = async (req, res) => {
  try {
    const {
      username,
      password,
      hoTen,
      soDienThoai,
      chucVu,
      ngayNhanViec,
      ngaySinh,
    } = req.body;
    const newMaNhanVien = await generateNewEmployeeId();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log("hoTen:", hoTen);
    // SỬa: Dùng db.NhanVien
    const newUser = await db.NhanVien.create({
      MaNhanVien: newMaNhanVien,
      HoTen: hoTen,
      NgaySinh: ngaySinh,
      SoDienThoai: soDienThoai,
      ChucVu: chucVu,
      Username: username,
      Password: hashedPassword,
      NgayNhanViec: ngayNhanViec || new Date(),
    });

    res
      .status(201)
      .json({
        message: "Tạo tài khoản thành công!",
        userId: newUser.MaNhanVien,
      });
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ error: "Username hoặc SĐT đã tồn tại" });
    }
    console.error(err);
    res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

// === HÀM ĐĂNG NHẬP ===
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Vui lòng nhập username và password" });
    }

    // SỬA: Dùng db.NhanVien - chỉ tìm nhân viên chưa bị xóa
    const user = await db.NhanVien.findOne({
      where: { Username: username, isDeleted: false },
    });

    if (!user) {
      return res
        .status(401)
        .json({ error: "Username hoặc password không đúng" });
    }

    const isMatch = await bcrypt.compare(password, user.Password);

    if (!isMatch) {
      return res
        .status(401)
        .json({ error: "Username hoặc password không đúng" });
    }

    const payload = {
      id: user.MaNhanVien,
      username: user.Username,
      role: user.ChucVu,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET_KEY, {
      expiresIn: "24h",
    });

    // SỬA: Gửi token qua Cookie
    res.cookie("authToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 giờ
    });

    res.status(200).json({
      message: "Đăng nhập thành công!",
    });
  } catch (err) {
    console.error("Lỗi khi đăng nhập:", err);
    res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

// =============================================================
// HÀM SỬA NHÂN VIÊN (UPDATE)
// =============================================================
const updateEmployee = async (req, res) => {
  const maNhanVien = req.params.maNV;
  const { hoTen, ngaySinh, soDienThoai, chucVu, ngayNhanViec, password } =
    req.body;

  try {
    const user = await db.NhanVien.findByPk(maNhanVien);
    if (!user) {
      return res.status(404).json({ error: "Không tìm thấy nhân viên." });
    }

    // Cập nhật thông tin: CHỈ UPDATE KHI CÓ DỮ LIỆU
    if (typeof hoTen !== "undefined") user.HoTen = hoTen;
    if (typeof ngaySinh !== "undefined") user.NgaySinh = ngaySinh;
    if (typeof soDienThoai !== "undefined") user.SoDienThoai = soDienThoai;
    if (typeof chucVu !== "undefined") user.ChucVu = chucVu;
    if (typeof ngayNhanViec !== "undefined") user.NgayNhanViec = ngayNhanViec;

    // Chỉ cập nhật mật khẩu NẾU nó được cung cấp
    if (password && password.length > 0) {
      const salt = await bcrypt.genSalt(10);
      user.Password = await bcrypt.hash(password, salt);
    }

    await user.save();
    res
      .status(200)
      .json({ message: "Cập nhật nhân viên thành công!", user: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

// =============================================================
// HÀM LẤY TẤT CẢ NHÂN VIÊN
// =============================================================
const getEmployees = async (req, res) => {
  try {
    const employees = await db.NhanVien.findAll({
      where: { isDeleted: false }, // Chỉ lấy những nhân viên chưa bị xóa
      raw: true, // Lấy dữ liệu dạng JSON thuần
    });
    res.status(200).json(employees);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

// =============================================================
// HÀM KIỂM TRA SỰ TỒN TẠI CỦA NHÂN VIÊN (AJAX)
// =============================================================
const checkEmployeeExists = async (req, res) => {
  try {
    const maNhanVien = req.params.maNV;
    if (!maNhanVien) {
      return res
        .status(400)
        .json({ exists: false, message: "Vui lòng cung cấp Mã Nhân viên." });
    }

    const employee = await db.NhanVien.findOne({
      where: { MaNhanVien: maNhanVien },
    });

    if (employee) {
      res.status(200).json({ exists: true });
    } else {
      res
        .status(200)
        .json({
          exists: false,
          message: "Mã nhân viên không tồn tại trong hệ thống.",
        });
    }
  } catch (err) {
    console.error("Lỗi khi kiểm tra nhân viên:", err);
    res.status(500).json({ exists: false, error: "Lỗi server nội bộ" });
  }
};

// =============================================================
// HÀM XÓA NHÂN VIÊN (SOFT DELETE)
// =============================================================
const deleteEmployee = async (req, res) => {
  const maNhanVien = req.params.maNV;

  try {
    const user = await db.NhanVien.findByPk(maNhanVien);
    if (!user) {
      return res.status(404).json({ error: "Không tìm thấy nhân viên." });
    }

    // Kiểm tra nếu nhân viên đã bị xóa rồi
    if (user.isDeleted) {
      return res.status(400).json({ error: "Nhân viên này đã bị xóa trước đó." });
    }

    // (Thêm logic kiểm tra an toàn ở đây, ví dụ: không cho xóa chính mình)
    // if (req.user.id === maNhanVien) {
    //     return res.status(403).json({ error: 'Bạn không thể tự xóa chính mình.' });
    // }

    // Soft delete: đánh dấu isDeleted = true thay vì xóa thật
    user.isDeleted = true;
    await user.save();
    
    res.status(200).json({ message: "Xóa nhân viên thành công!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi server nội bộ" });
  }
};

// --- THÊM: HÀM ĐĂNG XUẤT ---
const logout = (req, res) => {
  res.clearCookie("authToken"); // Xóa cookie
  res.redirect("/login"); // Chuyển hướng về trang login
};

module.exports = {
  getLoginPage,
  getEmployees,
  registerEmployee,
  updateEmployee,
  deleteEmployee,
  checkEmployeeExists,
  login,
  logout,
};
