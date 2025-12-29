// index.js
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

const loginRoutes = require("./routes/loginRoutes");
app.use("/", loginRoutes);
const protectedRoutes = express.Router();
protectedRoutes.use(authenticateToken);

const dashboardRoutes = require("./routes/dashboardRoutes");
protectedRoutes.use("/dashboard", dashboardRoutes);

const billRoutes = require("./routes/billRoutes");
protectedRoutes.use("/api/bill", billRoutes);

const customersRoutes = require("./routes/customersRoutes");
protectedRoutes.use("/api/customers", customersRoutes);

const changeruleRoutes = require("./routes/changeruleRoutes");
protectedRoutes.use("/api/change-rules", changeruleRoutes);

const reportRoutes = require("./routes/reportRoutes");
protectedRoutes.use("/api/report", reportRoutes); // Changed this line

// Routes for book management (API)
const booksRoutes = require("./routes/booksRoutes");
protectedRoutes.use("/api/books", booksRoutes);

const receiptsRoutes = require("./routes/receiptsRoutes");
protectedRoutes.use("/api/receipts", receiptsRoutes);

const booksimportRoutes = require("./routes/booksimportRoutes");
protectedRoutes.use("/api/import", booksimportRoutes);

const inventoryRoutes = require("./routes/inventoryRoutes");
protectedRoutes.use("/api/inventory", inventoryRoutes);

// Route xử lý API của Admin
const employeesRoutes = require("./routes/employeesRoutes");
protectedRoutes.use("/api/employees", employeesRoutes);

app.use(protectedRoutes);

// --- Khởi động Server và Đồng bộ Database ---

// Tạo một hàm async để khởi động
const startServer = async () => {
  try {
    // Chỉ chạy sequelize.authenticate và sequelize.sync khi ứng dụng được chạy trực tiếp (không phải trong môi trường test)
    if (process.env.NODE_ENV !== "test") {
      await sequelize.authenticate();
      console.log("Kết nối MySQL thành công.");

      await sequelize.sync({ force: false });
      console.log("Bảng đã được đồng bộ.");
    }

    // 3. Khởi động Express server
    if (require.main === module) {
      app.listen(PORT, () => {
        console.log(`Server đang chạy tại http://localhost:${PORT}`);
      });
    }
  } catch (err) {
    console.error("Lỗi không thể khởi động server:", err);
  }
};

// Gọi hàm để bắt đầu
startServer();

module.exports = app;
