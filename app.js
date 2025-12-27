const express = require("express");
const session = require("express-session");
const path = require("path");
const app = express();
const port = 3000;

// Import routes
const loginRoutes = require("./routes/loginRoutes");
const customerRoutes = require("./routes/customersRoutes");
const booksRoutes = require("./routes/booksRoutes");
const booksImportRoutes = require("./routes/booksimportRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

// === MIDDLEWARE SETUP ===
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(
  session({
    secret: "bookstore-secret-key-2024",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
    },
  })
);

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Static files
app.use(express.static(path.join(__dirname, "public")));

// === MOUNT ROUTES ===
app.use("/", loginRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/books", booksRoutes); // ✅ Prefix /api/books
app.use("/api/import", booksImportRoutes); // ✅ Prefix /api/import
app.use("/dashboard", dashboardRoutes); // ✅ Dashboard routes

// Trang chủ
app.get("/", (req, res) => {
  res.send("Welcome to the Bookstore Management API");
});

// 404 handler
app.use((req, res) => {
  res.status(404).send("Page not found");
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
