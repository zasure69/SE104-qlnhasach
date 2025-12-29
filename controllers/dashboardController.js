// controllers/dashboardController.js
const db = require("../models");
const { Op } = require("sequelize");

// --- Lấy thông tin User (để hiển thị tên) ---
const getUserInfo = (req) => {
  console.log("User info:", req.user);
  return {
    id: req.user.id,
    username: req.user.username,
    role: req.user.role,
    MaNV: req.user.id,
  };
};

// =============================================================
//  Render Trang Tổng Quan (dashboard.ejs)
// =============================================================
const getDashboardPage = (req, res) => {
  try {
    res.render("dashboard", { ...getUserInfo(req) });
  } catch (err) {
    res.status(500).send("Lỗi Server");
  }
};

const getEmployeesPage = async (req, res) => {
  try {
    // 1. Lấy thông tin user (để hiển thị "Chào, username")
    const userInfo = {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
    };

    // 2. Lấy nhân viên chưa bị xóa từ database
    //    Chúng ta dùng db.NhanVien vì nó ánh xạ đến bảng NHANVIEN
    const allEmployees = await db.NhanVien.findAll({
      where: { isDeleted: false },
      raw: true, // Lấy dữ liệu dạng JSON thuần
    });

    // 3. Render trang 'employees.ejs' VÀ TRUYỀN DỮ LIỆU VÀO
    res.render("employees", {
      ...userInfo, // Gửi 'username' và 'role'
      employees: allEmployees, // <-- GỬI BIẾN 'employees'
    });
  } catch (err) {
    console.error("Lỗi khi lấy dữ liệu nhân viên:", err);
    res.status(500).send("Lỗi Server");
  }
};

const getCustomersPage = async (req, res) => {
  try {
    // 1. Lấy thông tin user (để hiển thị "Chào, username")
    const userInfo = {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
    };

    // 2. Lấy khách hàng chưa bị xóa từ database
    const allCustomers = await db.KhachHang.findAll({
      where: { isDeleted: false },
      raw: true, // Lấy dữ liệu dạng JSON thuần
    });

    // 3. Render trang 'customers.ejs' VÀ TRUYỀN DỮ LIỆU VÀO
    res.render("customers", {
      ...userInfo, // Gửi 'username' và 'role'
      customers: allCustomers, // <-- GỬI BIẾN 'customers'
    });
  } catch (err) {
    console.error("Lỗi khi lấy dữ liệu nhân viên:", err);
    res.status(500).send("Lỗi Server");
  }
};

const getSearchPage = async (req, res) => {
  // <-- 1. CHUYỂN THÀNH ASYNC
  try {
    const userInfo = {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
    };

    // 2. Lấy khách hàng chưa bị xóa
    const allCustomers = await db.KhachHang.findAll({
      where: { isDeleted: false },
      raw: true,
    });

    const allBooks = await db.Sach.findAll({
      where: { isDeleted: false },
      include: [
        {
          model: db.DauSach,
          where: { isDeleted: false },
          required: true,
          include: [
            // 1. Join với bảng Thể Loại (Giữ nguyên)
            {
              model: db.TheLoai,
              where: { isDeleted: false },
              required: false,
            },
            // 2. Join với bảng Tác Giả (Thông qua CT_TacGia)
            {
              model: db.TacGia,
              as: "TacGias",
              where: { isDeleted: false },
              required: false, // Để sách chưa có tác giả vẫn hiện ra
              through: {
                attributes: [], // (Tuỳ chọn) Ẩn các cột của bảng trung gian CT_TacGia để kết quả gọn hơn
              },
            },
          ],
        },
      ],
      raw: true,
      nest: true,
    });

    // 4. Render trang VÀ gửi dữ liệu vào
    res.render("search", {
      ...userInfo,
      customers: allCustomers, // Gửi danh sách khách hàng
      books: allBooks, // Gửi danh sách sách
    });
  } catch (err) {
    console.error("Lỗi render trang tra cứu:", err);
    res.status(500).send("Lỗi Server");
  }
};

const getBillsPage = async (req, res) => {
  try {
    const userInfo = getUserInfo(req);

    // 1. Lấy danh sách hóa đơn chưa bị xóa, JOIN với Khách hàng
    const bills = await db.HoaDon.findAll({
      where: { isDeleted: false },
      include: [
        {
          model: db.KhachHang,
          as: "KhachHang",
          attributes: ["HoVaTen"], // Lấy tên khách hàng
        },
      ],
      order: [["NgayLapHoaDon", "ASC"]],
    });
    console.log(bills)
    // 2. Render trang bills.ejs và truyền dữ liệu
    res.render("bills", {
      ...userInfo,
      currentActivePage: "bills", // Thiết lập active page
      bills: bills, // Truyền dữ liệu hóa đơn
    });
  } catch (err) {
    console.error("Lỗi render trang hóa đơn:", err);
    res.status(500).send("Lỗi Server: " + err.message);
  }
};

const getChangeRulePage = async (req, res) => {
  try {
    const userInfo = getUserInfo(req);

    // 1. Lấy tất cả quy định từ DB
    const allRules = await db.ThamSo.findAll({ raw: true });

    // 2. Render trang và gửi dữ liệu vào
    res.render("changerule", {
      ...userInfo,
      rules: allRules, // Gửi object chứa các quy định
    });
  } catch (err) {
    console.error("Lỗi khi lấy dữ liệu quy định:", err);
    res.status(500).send("Lỗi Server");
  }
};
const getReportPage = async (req, res) => {
  try {
    const userInfo = getUserInfo(req);

    /* ============================
           1. BÁO CÁO TỒN KHO
        ============================= */
    const dataTon = await db.Sach.findAll({
      where: { isDeleted: false },
      include: [
        { model: db.DauSach, where: { isDeleted: false }, required: false },
      ],
    });

    const ton = dataTon.map((item) => ({
      MaSach: item.MaSach,
      TenSach: item.DauSach?.TenSach,
      SoLuongTon: item.SoLuongTon,
      NamXB: item.NamXB,
      NhaXB: item.NhaXB,
    }));

    /* ============================
           2. BÁO CÁO CÔNG NỢ
        ============================= */
    const listKH = await db.KhachHang.findAll({
      where: { isDeleted: false },
      include: [
        { model: db.HoaDon, where: { isDeleted: false }, required: false },
        {
          model: db.PhieuThuTien,
          where: { isDeleted: false },
          required: false,
        },
      ],
    });

    const congno = listKH.map((kh) => {
      const tongHoaDon = kh.HoaDons.reduce(
        (sum, hd) => sum + parseFloat(hd.ConLai || 0),
        0
      );

      const tongThu = kh.PhieuThuTiens.reduce(
        (sum, pt) => sum + parseFloat(pt.SoTienThu || 0),
        0
      );

      return {
        MaKhachHang: kh.MaKhachHang,
        HoVaTen: kh.HoVaTen,
        TongNo: tongHoaDon - tongThu,
      };
    });

    /* ============================
           3. BÁO CÁO DOANH THU (tháng hiện tại)
        ============================= */
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const listHD = await db.HoaDon.findAll({
      where: {
        isDeleted: false,
        NgayLapHoaDon: {
          [Op.between]: [`${year}-${month}-01`, `${year}-${month}-31`],
        },
      },
      include: [
        {
          model: db.CT_HD,
          include: [
            {
              model: db.Sach,
              include: [db.DauSach],
            },
          ],
        },
      ],
    });

    let totalRevenue = 0;
    let revenueByCategory = {};

    listHD.forEach((hd) => {
      hd.CT_HD.forEach((ct) => {
        const tien = parseFloat(ct.ThanhTien || 0);

        totalRevenue += tien;

        const theLoai = ct.Sach?.DauSach?.MaTheLoai || "Chưa rõ";

        if (!revenueByCategory[theLoai]) {
          revenueByCategory[theLoai] = 0;
        }

        revenueByCategory[theLoai] += tien;
      });
    });

    /* ============================
           RENDER TRANG + GỬI DATA
        ============================= */
    res.render("report", {
      ...userInfo,
      bcton: {},
      bccongno: {},
      bcdoanhthu: {},
    });
  } catch (err) {
    console.error("Lỗi render trang báo cáo:", err);
    res.status(500).send("Lỗi Server");
  }
};

const getReceiptsPage = async (req, res) => {
  try {
    const userInfo = getUserInfo(req);

    // 1. Lấy danh sách phiếu thu chưa bị xóa, JOIN với Khách hàng
    const receipts = await db.PhieuThuTien.findAll({
      where: { isDeleted: false },
      // PhieuThuTien.belongsTo(KhachHang) đã được thiết lập trong index.js
      include: [
        {
          model: db.KhachHang,
          as: "KhachHang", // Đảm bảo alias này khớp với mối quan hệ đã định nghĩa
          attributes: ["HoVaTen", "TongNo"], // Lấy tên và nợ của khách hàng
        },
      ],
      order: [
        ["MaPhieuThu", "ASC"],
        ["NgayThuTien", "DESC"],
      ], // Sắp xếp theo ngày mới nhất
    });

    // 2. Render trang receipts.ejs và truyền dữ liệu
    res.render("receipts", {
      ...userInfo,
      currentActivePage: "receipts", // Thiết lập active page cho menu
      receipts: receipts, // Truyền dữ liệu Phiếu Thu Tiền
    });
  } catch (err) {
    console.error("Lỗi render trang phiếu thu tiền:", err);
    res.status(500).send("Lỗi Server: " + err.message);
  }
};

// =============================================================
//  ADMIN: Trang quản lý dữ liệu đã xóa
// =============================================================
const getTrashPage = async (req, res) => {
  try {
    const userInfo = getUserInfo(req);

    // Lấy tất cả dữ liệu đã xóa mềm
    const [
      deletedEmployees,
      deletedCustomers,
      deletedDauSach,
      deletedSach,
      deletedTheLoai,
      deletedTacGia,
      deletedImports,
      deletedBills,
      deletedReceipts,
      deletedInventory,
    ] = await Promise.all([
      db.NhanVien.findAll({ where: { isDeleted: true }, raw: true }),
      db.KhachHang.findAll({ where: { isDeleted: true }, raw: true }),
      db.DauSach.findAll({
        where: { isDeleted: true },
        include: [
          { model: db.TheLoai, attributes: ["TenTheLoai"], required: false },
        ],
        raw: false,
      }),
      db.Sach.findAll({
        where: { isDeleted: true },
        include: [
          { model: db.DauSach, attributes: ["TenSach"], required: false },
        ],
        raw: false,
      }),
      db.TheLoai.findAll({ where: { isDeleted: true }, raw: true }),
      db.TacGia.findAll({ where: { isDeleted: true }, raw: true }),
      db.PhieuNhapSach.findAll({ where: { isDeleted: true }, raw: true }),
      db.HoaDon.findAll({
        where: { isDeleted: true },
        include: [
          { model: db.KhachHang, attributes: ["HoVaTen"], required: false },
        ],
        raw: false,
      }),
      db.PhieuThuTien.findAll({
        where: { isDeleted: true },
        include: [
          {
            model: db.KhachHang,
            as: "KhachHang",
            attributes: ["HoVaTen"],
            required: false,
          },
        ],
        raw: false,
      }),
      db.PhieuKiemKe.findAll({
        where: { isDeleted: true },
        include: [
          { model: db.NhanVien, attributes: ["HoTen"], required: false },
        ],
        raw: false,
      }),
    ]);

    res.render("admin_trash", {
      ...userInfo,
      deletedEmployees,
      deletedCustomers,
      deletedDauSach: deletedDauSach.map((d) => d.get({ plain: true })),
      deletedSach: deletedSach.map((s) => s.get({ plain: true })),
      deletedTheLoai,
      deletedTacGia,
      deletedImports,
      deletedBills: deletedBills.map((b) => b.get({ plain: true })),
      deletedReceipts: deletedReceipts.map((r) => r.get({ plain: true })),
      deletedInventory: deletedInventory.map((i) => i.get({ plain: true })),
    });
  } catch (err) {
    console.error("Lỗi render trang thùng rác:", err);
    res.status(500).send("Lỗi Server: " + err.message);
  }
};

// Xuất tất cả các hàm
module.exports = {
  getDashboardPage,
  getEmployeesPage,
  getCustomersPage,
  getSearchPage,
  getChangeRulePage,
  getBillsPage,
  getReceiptsPage,
  getReportPage,
  getTrashPage,
};
