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

    // 2. Xây dựng filter từ query params
    const filters = {
      maNhanVien: (req.query.maNhanVien || "").trim(),
      hoTen: (req.query.hoTen || "").trim(),
      soDienThoai: (req.query.soDienThoai || "").trim(),
      chucVu: (req.query.chucVu || "").trim(),
      username: (req.query.username || "").trim(),
      fromNgayNhanViec: (req.query.fromNgayNhanViec || "").trim(),
      toNgayNhanViec: (req.query.toNgayNhanViec || "").trim(),
    };

    // 3. Tạo điều kiện where
    const whereConditions = { isDeleted: false };

    if (filters.maNhanVien) {
      whereConditions.MaNhanVien = { [Op.like]: `%${filters.maNhanVien}%` };
    }
    if (filters.hoTen) {
      whereConditions.HoTen = { [Op.like]: `%${filters.hoTen}%` };
    }
    if (filters.soDienThoai) {
      whereConditions.SoDienThoai = { [Op.like]: `%${filters.soDienThoai}%` };
    }
    if (filters.chucVu) {
      whereConditions.ChucVu = filters.chucVu;
    }
    if (filters.username) {
      whereConditions.Username = { [Op.like]: `%${filters.username}%` };
    }
    if (filters.fromNgayNhanViec) {
      whereConditions.NgayNhanViec = whereConditions.NgayNhanViec || {};
      whereConditions.NgayNhanViec[Op.gte] = filters.fromNgayNhanViec;
    }
    if (filters.toNgayNhanViec) {
      whereConditions.NgayNhanViec = whereConditions.NgayNhanViec || {};
      whereConditions.NgayNhanViec[Op.lte] = filters.toNgayNhanViec;
    }

    // 4. Lấy nhân viên từ database với filter
    const allEmployees = await db.NhanVien.findAll({
      where: whereConditions,
      raw: true,
    });

    // 5. Render trang 'employees.ejs' VÀ TRUYỀN DỮ LIỆU VÀO
    res.render("employees", {
      ...userInfo,
      employees: allEmployees,
      filters: filters,
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

const getBillsPage = async (req, res) => {
  try {
    const userInfo = getUserInfo(req);

    const filters = {
      maHoaDon: (req.query.maHoaDon || "").trim(),
      khachHang: (req.query.khachHang || "").trim(),
      sdt: (req.query.sdt || "").trim(),
      from: (req.query.from || "").trim(),
      to: (req.query.to || "").trim(),
      status: (req.query.status || "").trim(),
      opConNo: (req.query.opConNo || "").trim(),
      conNo1: (req.query.conNo1 || "").trim(),
      conNo2: (req.query.conNo2 || "").trim(),
    };

    const normalizeMoney = (value) => {
      if (value === null || value === undefined) return null;
      const cleaned = value.toString().replace(/[^0-9]/g, "");
      if (!cleaned) return null;
      const parsed = Number(cleaned);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const andConditions = [{ isDeleted: false }];

    if (filters.maHoaDon) {
      andConditions.push({ MaHoaDon: { [Op.like]: `%${filters.maHoaDon}%` } });
    }

    // Lọc theo ngày (DATEONLY từ input), đổi endDate sang cuối ngày
    if (filters.from || filters.to) {
      const start = filters.from
        ? new Date(`${filters.from}T00:00:00.000`)
        : null;
      const end = filters.to ? new Date(`${filters.to}T23:59:59.999`) : null;

      if (start && end) {
        andConditions.push({ NgayLapHoaDon: { [Op.between]: [start, end] } });
      } else if (start) {
        andConditions.push({ NgayLapHoaDon: { [Op.gte]: start } });
      } else if (end) {
        andConditions.push({ NgayLapHoaDon: { [Op.lte]: end } });
      }
    }

    // Lọc theo trạng thái (dựa vào ConLai)
    if (filters.status === "paid") {
      andConditions.push({ ConLai: { [Op.eq]: 0 } });
    } else if (filters.status === "debt") {
      andConditions.push({ ConLai: { [Op.gt]: 0 } });
    }

    // Lọc theo còn nợ (ConLai) theo toán tử / khoảng
    const conNoMin = normalizeMoney(filters.conNo1);
    const conNoMax = normalizeMoney(filters.conNo2);
    if (filters.opConNo) {
      if (filters.opConNo === "range") {
        if (conNoMin !== null && conNoMax !== null) {
          const min = Math.min(conNoMin, conNoMax);
          const max = Math.max(conNoMin, conNoMax);
          andConditions.push({ ConLai: { [Op.between]: [min, max] } });
        } else if (conNoMin !== null) {
          andConditions.push({ ConLai: { [Op.gte]: conNoMin } });
        }
      } else if (conNoMin !== null) {
        const opMap = {
          eq: Op.eq,
          gt: Op.gt,
          gte: Op.gte,
          lt: Op.lt,
          lte: Op.lte,
        };
        const sequelizeOp = opMap[filters.opConNo];
        if (sequelizeOp) {
          andConditions.push({ ConLai: { [sequelizeOp]: conNoMin } });
        }
      }
    }

    const whereHoaDon =
      andConditions.length > 1 ? { [Op.and]: andConditions } : andConditions[0];

    // Lọc theo KH (tên / SĐT)
    const customerWhereAnd = [];
    if (filters.khachHang) {
      customerWhereAnd.push({
        HoVaTen: { [Op.like]: `%${filters.khachHang}%` },
      });
    }
    if (filters.sdt) {
      customerWhereAnd.push({ SoDienThoai: { [Op.like]: `%${filters.sdt}%` } });
    }

    // 1. Lấy danh sách hóa đơn chưa bị xóa, JOIN với Khách hàng và Nhân viên
    const bills = await db.HoaDon.findAll({
      where: whereHoaDon,
      include: [
        {
          model: db.KhachHang,
          as: "KhachHang",
          attributes: ["HoVaTen", "SoDienThoai", "MaKhachHang"],
          required: customerWhereAnd.length > 0, // nếu có filter KH thì dùng INNER JOIN
          where:
            customerWhereAnd.length > 0
              ? { [Op.and]: customerWhereAnd }
              : undefined,
        },
        {
          model: db.NhanVien,
          as: "NhanVien",
          attributes: ["HoTen"], // Lấy tên nhân viên lập hóa đơn
        },
      ],
      order: [["NgayLapHoaDon", "ASC"]],
    });
    console.log(bills);
    // 2. Render trang bills.ejs và truyền dữ liệu
    res.render("bills", {
      ...userInfo,
      currentActivePage: "bills", // Thiết lập active page
      bills: bills, // Truyền dữ liệu hóa đơn
      filters,
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

    const filters = {
      maPhieuThu: (req.query.maPhieuThu || "").trim(),
      khachHang: (req.query.khachHang || "").trim(),
      sdt: (req.query.sdt || "").trim(),
      from: (req.query.from || "").trim(),
      to: (req.query.to || "").trim(),
      opSoTien: (req.query.opSoTien || "").trim(),
      soTien1: (req.query.soTien1 || "").trim(),
      soTien2: (req.query.soTien2 || "").trim(),
      nguoiLap: (req.query.nguoiLap || "").trim(),
    };

    const andConditions = [{ isDeleted: false }];

    if (filters.maPhieuThu) {
      andConditions.push({
        MaPhieuThu: { [Op.like]: `%${filters.maPhieuThu}%` },
      });
    }

    if (filters.from || filters.to) {
      let start = null;
      let end = null;
      if (filters.from) {
        start = new Date(filters.from);
        start.setHours(0, 0, 0, 0);
      }
      if (filters.to) {
        end = new Date(filters.to);
        end.setHours(23, 59, 59, 999);
      }

      if (start && end) {
        andConditions.push({ NgayThuTien: { [Op.between]: [start, end] } });
      } else if (start) {
        andConditions.push({ NgayThuTien: { [Op.gte]: start } });
      } else if (end) {
        andConditions.push({ NgayThuTien: { [Op.lte]: end } });
      }
    }

    if (filters.opSoTien) {
      const soTien1 = parseFloat(filters.soTien1);
      const soTien2 = parseFloat(filters.soTien2);

      if (filters.opSoTien === "range") {
        if (!Number.isNaN(soTien1) && !Number.isNaN(soTien2)) {
          const min = Math.min(soTien1, soTien2);
          const max = Math.max(soTien1, soTien2);
          andConditions.push({ SoTienThu: { [Op.between]: [min, max] } });
        } else if (!Number.isNaN(soTien1)) {
          andConditions.push({ SoTienThu: { [Op.gte]: soTien1 } });
        }
      } else {
        const opMap = {
          eq: Op.eq,
          gt: Op.gt,
          gte: Op.gte,
          lt: Op.lt,
          lte: Op.lte,
        };
        const sequelizeOp = opMap[filters.opSoTien];
        if (sequelizeOp && !Number.isNaN(soTien1)) {
          andConditions.push({ SoTienThu: { [sequelizeOp]: soTien1 } });
        }
      }
    }

    const where = andConditions.length > 0 ? { [Op.and]: andConditions } : {};

    const customerWhere = {};
    if (filters.khachHang) {
      customerWhere.HoVaTen = { [Op.like]: `%${filters.khachHang}%` };
    }
    if (filters.sdt) {
      customerWhere.SoDienThoai = { [Op.like]: `%${filters.sdt}%` };
    }
    const hasCustomerWhere = Object.keys(customerWhere).length > 0;

    const employeeWhere = {};
    if (filters.nguoiLap) {
      employeeWhere[Op.or] = [
        { HoTen: { [Op.like]: `%${filters.nguoiLap}%` } },
        { Username: { [Op.like]: `%${filters.nguoiLap}%` } },
      ];
    }
    const hasEmployeeWhere = Object.keys(employeeWhere).length > 0;

    // 1. Lấy danh sách phiếu thu chưa bị xóa, JOIN với Khách hàng + Nhân viên
    const receipts = await db.PhieuThuTien.findAll({
      where,
      include: [
        {
          model: db.KhachHang,
          as: "KhachHang",
          attributes: ["HoVaTen", "TongNo", "SoDienThoai"],
          required: hasCustomerWhere,
          ...(hasCustomerWhere ? { where: customerWhere } : {}),
        },
        {
          model: db.NhanVien,
          attributes: ["MaNhanVien", "HoTen", "Username"],
          required: hasEmployeeWhere,
          ...(hasEmployeeWhere ? { where: employeeWhere } : {}),
        },
      ],
      order: [
        ["NgayThuTien", "ASC"],
        ["MaPhieuThu", "ASC"],
      ],
    });

    // 2. Render trang receipts.ejs và truyền dữ liệu
    res.render("receipts", {
      ...userInfo,
      currentActivePage: "receipts", // Thiết lập active page cho menu
      receipts: receipts, // Truyền dữ liệu Phiếu Thu Tiền
      filters,
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
  getChangeRulePage,
  getBillsPage,
  getReceiptsPage,
  getReportPage,
  getTrashPage,
};
