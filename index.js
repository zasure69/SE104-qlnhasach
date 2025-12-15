const express = require("express");
const path = require("path");
const sequelize = require("./config/db"); // Import kết nối sequelize
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const authenticateToken = require("./middleware/authMiddleware"); // Import Middleware xác thực JWT
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware để đọc JSON và form-urlencoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// --- CẤU HÌNH TEMPLATE ENGINE ---
// 1. Đặt 'view engine' là 'ejs'
app.set("view engine", "ejs");
// 2. Chỉ cho Express biết thư mục 'views' nằm ở đâu
app.set("views", path.join(__dirname, "views"));

// --- Định nghĩa Routes ---
// --- ROUTE GỐC (Xử lý chuyển hướng) ---
app.get("/", (req, res) => {
  // 1. Lấy token từ cookie
  const token = req.cookies.authToken;

  // 2. Nếu không có token -> chuyển đến trang login
  if (!token) {
    return res.redirect("/login");
  }

  // 3. Nếu có token, kiểm tra xem nó có hợp lệ không
  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, user) => {
    if (err) {
      // 4. Token không hợp lệ (hết hạn, sai) -> xóa cookie và đến login
      res.clearCookie("authToken");
      return res.redirect("/login");
    }

    // 5. Token hợp lệ -> chuyển đến dashboard
    return res.redirect("/dashboard");
  });
});

const userRoutes = require("./routes/userRoutes");
app.use("/", userRoutes);
app.use(authenticateToken); // Áp dụng middleware xác thực cho các route sau
// route được bảo vệ
const dashboardRoutes = require("./routes/dashboardRoutes");
app.use("/dashboard", dashboardRoutes);

const billRoutes = require('./routes/billRoutes');
app.use('/api/bill', billRoutes);

const customersRoutes = require('./routes/customersRoutes');
app.use('/api/customers', customersRoutes);

const searchRoutes = require("./routes/searchRoutes");
app.use("/api/search", searchRoutes);

const changeruleRoutes = require("./routes/changeruleRoutes");
app.use("/api/change-rules", changeruleRoutes);

const reportRoutes = require("./routes/reportRoutes");
app.use("/api/reports", reportRoutes);

// Routes for book management (API)
const booksRoutes = require("./routes/booksRoutes");
app.use("/api/books", booksRoutes);

const receiptsRoutes = require('./routes/receiptsRoutes');
app.use('/api/receipts', receiptsRoutes);

const booksimportRoutes = require('./routes/booksimportRoutes');
app.use('/api/import', booksimportRoutes);

// Route xử lý API của Admin
const employeesRoutes = require("./routes/employeesRoutes");
app.use("/api/employees", employeesRoutes);

// --- Khởi động Server và Đồng bộ Database ---

// Tạo một hàm async để khởi động
const startServer = async () => {
  try {
    // 1. Xác thực kết nối database
    await sequelize.authenticate();
    console.log("Kết nối MySQL thành công.");

    // 2. Đồng bộ models (tạo bảng nếu chưa có)
    // { force: false } (mặc định) sẽ không xóa bảng nếu đã tồn tại
    // { force: true } sẽ xóa bảng cũ và tạo lại (mất dữ liệu)
    await sequelize.sync({ force: false });
    console.log("Bảng đã được đồng bộ.");

    // 3. Khởi động Express server
    app.listen(PORT, () => {
      console.log(`Server đang chạy tại http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Lỗi không thể khởi động server:", err);
  }
};



// Gọi hàm để bắt đầu
startServer();
