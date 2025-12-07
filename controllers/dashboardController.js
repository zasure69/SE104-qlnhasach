// controllers/dashboardController.js
const db = require('../models');
const { Op } = require('sequelize');

// --- Lấy thông tin User (để hiển thị tên) ---
const getUserInfo = (req) => {
    return {
      username: req.user.username,
      role: req.user.role
    };
  };
  
  // =============================================================
  //  Render Trang Tổng Quan (dashboard.ejs)
  // =============================================================
  const getDashboardPage = (req, res) => {
    try {
      res.render('dashboard', { ...getUserInfo(req) });
    } catch (err) {
      res.status(500).send('Lỗi Server');
    }
  };

  const getEmployeesPage = async (req, res) => {
    try {
      // 1. Lấy thông tin user (để hiển thị "Chào, username")
      const userInfo = {
          username: req.user.username,
          role: req.user.role
      };
  
      // 2. Lấy TẤT CẢ nhân viên từ database
      //    Chúng ta dùng db.User vì nó ánh xạ đến bảng NHANVIEN
      const allEmployees = await db.User.findAll({
          raw: true // Lấy dữ liệu dạng JSON thuần
      });
  
      // 3. Render trang 'employees.ejs' VÀ TRUYỀN DỮ LIỆU VÀO
      res.render('employees', {
        ...userInfo, // Gửi 'username' và 'role'
        employees: allEmployees // <-- GỬI BIẾN 'employees'
      });
  
    } catch (err) {
      console.error('Lỗi khi lấy dữ liệu nhân viên:', err);
      res.status(500).send('Lỗi Server');
    }
  };

  const getCustomersPage = async (req, res) => {
    try {
      // 1. Lấy thông tin user (để hiển thị "Chào, username")
      const userInfo = {
          username: req.user.username,
          role: req.user.role
      };
  
      // 2. Lấy TẤT CẢ khách hàng từ database
      const allCustomers = await db.KhachHang.findAll({
          raw: true // Lấy dữ liệu dạng JSON thuần
      });
  
      // 3. Render trang 'customers.ejs' VÀ TRUYỀN DỮ LIỆU VÀO
      res.render('customers', {
        ...userInfo, // Gửi 'username' và 'role'
        customers: allCustomers // <-- GỬI BIẾN 'customers'
      });
  
    } catch (err) {
      console.error('Lỗi khi lấy dữ liệu nhân viên:', err);
      res.status(500).send('Lỗi Server');
    }
  };

  const getSearchPage = async (req, res) => { // <-- 1. CHUYỂN THÀNH ASYNC
    try {
      const userInfo = {
          username: req.user.username,
          role: req.user.role
      };
  
      // 2. Lấy TẤT CẢ khách hàng
      const allCustomers = await db.KhachHang.findAll({ raw: true });
  
      // // 3. Lấy TẤT CẢ sách (với join)
      // const allBooks = await db.Sach.findAll({
      //   include: [{
      //     model: db.DauSach,
      //     required: true,
      //     include: [{
      //       model: db.TheLoai,
      //       required: false // Vẫn lấy sách dù chưa có thể loại
      //     }]
      //   }],
      //   raw: true,
      //   nest: true
      // });
  
      // 4. Render trang VÀ gửi dữ liệu vào
      res.render('search', { 
          ...userInfo,
          customers: allCustomers, // Gửi danh sách khách hàng
          //books: allBooks          // Gửi danh sách sách
      });
  
    } catch (err) {
      console.error('Lỗi render trang tra cứu:', err);
      res.status(500).send('Lỗi Server');
    }
  };

  const getBillsPage = async (req, res) => {
    try {
        const userInfo = getUserInfo(req);

        // 1. Lấy danh sách hóa đơn, JOIN với Khách hàng (bước này thay thế billController.index)
        const bills = await db.HoaDon.findAll({
            include: [{ 
                model: db.KhachHang, 
                as: 'KhachHang',
                attributes: ['HoVaTen'] // Lấy tên khách hàng
            }],
            order: [['NgayLapHoaDon', 'DESC']]
        });
        
        // 2. Render trang bills.ejs và truyền dữ liệu
        res.render('bills', {
            ...userInfo,
            currentActivePage: 'bills', // Thiết lập active page
            bills: bills // Truyền dữ liệu hóa đơn
        });
        
    } catch (err) {
        console.error('Lỗi render trang hóa đơn:', err);
        res.status(500).send('Lỗi Server: ' + err.message);
    }
};

  const getChangeRulePage = async (req, res) => {
    try {
      const userInfo = getUserInfo(req);
  
      // 1. Lấy tất cả quy định từ DB
      const allRules = await db.ThamSo.findAll({ raw: true });
  
      // 2. Render trang và gửi dữ liệu vào
      res.render('changerule', { 
          ...userInfo,
          rules: allRules // Gửi object chứa các quy định
      });
  
    } catch (err) {
      console.error('Lỗi khi lấy dữ liệu quy định:', err);
      res.status(500).send('Lỗi Server');
    }
  };
const getReportPage = async (req, res) => {
    try {
        const userInfo = getUserInfo(req);

        /* ============================
           1. BÁO CÁO TỒN KHO
        ============================= */
        const dataTon = await db.Sach.findAll({
            include: [{ model: db.DauSach }]
        });

        const ton = dataTon.map(item => ({
            MaSach: item.MaSach,
            TenSach: item.DauSach?.TenSach,
            SoLuongTon: item.SoLuongTon,
            NamXB: item.NamXB,
            NhaXB: item.NhaXB
        }));

        /* ============================
           2. BÁO CÁO CÔNG NỢ
        ============================= */
        const listKH = await db.KhachHang.findAll({
            include: [
                { model: db.HoaDon },
                { model: db.PhieuThuTien }
            ]
        });

        const congno = listKH.map(kh => {
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
                TongNo: tongHoaDon - tongThu
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
                NgayLapHoaDon: {
                    [Op.between]: [
                        `${year}-${month}-01`,
                        `${year}-${month}-31`
                    ]
                }
            },
            include: [{
                model: db.CT_HD,
                include: [{
                    model: db.Sach,
                    include: [db.DauSach]
                }]
            }]
        });

        let totalRevenue = 0;
        let revenueByCategory = {};

        listHD.forEach(hd => {
            hd.CT_HDs.forEach(ct => {
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
            bcdoanhthu: {}
        });

    } catch (err) {
        console.error("Lỗi render trang báo cáo:", err);
        res.status(500).send("Lỗi Server");
    }
};

  const getReceiptsPage = async (req, res) => {
    try {
        const userInfo = getUserInfo(req);
        
        // 1. Lấy danh sách phiếu thu, JOIN với Khách hàng
        const receipts = await db.PhieuThuTien.findAll({
            // PhieuThuTien.belongsTo(KhachHang) đã được thiết lập trong index.js
            include: [{ 
                model: db.KhachHang, 
                as: 'KhachHang', // Đảm bảo alias này khớp với mối quan hệ đã định nghĩa
                attributes: ['HoVaTen', 'TongNo'] // Lấy tên và nợ của khách hàng
            }],
            order: [['NgayThuTien', 'DESC'], ['MaPhieuThu', 'DESC']] // Sắp xếp theo ngày mới nhất
        });
        
        // 2. Render trang receipts.ejs và truyền dữ liệu
        res.render('receipts', {
            ...userInfo,
            currentActivePage: 'receipts', // Thiết lập active page cho menu
            receipts: receipts // Truyền dữ liệu Phiếu Thu Tiền
        });
        
    } catch (err) {
        console.error('Lỗi render trang phiếu thu tiền:', err);
        res.status(500).send('Lỗi Server: ' + err.message);
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
    getReportPage 
  };