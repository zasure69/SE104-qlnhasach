const db = require('../models');

// === HÀM HELPER: TẠO MÃ KHÁCH HÀNG MỚI ===
async function generateNewCustomerId() {
  const prefix = 'KH';
  const paddingLength = 3; // Sẽ tạo ra KH001, KH002...

  const lastCustomer = await db.KhachHang.findOne({
    order: [
      [db.sequelize.literal(`CAST(SUBSTRING(MaKhachHang, ${prefix.length + 1}) AS UNSIGNED)`), 'DESC']
    ],
    attributes: ['MaKhachHang'],
    raw: true
  });

  let lastIdNumber = 0;
  if (lastCustomer && lastCustomer.MaKhachHang) {
    try {
      lastIdNumber = parseInt(lastCustomer.MaKhachHang.substring(prefix.length), 10);
    } catch (error) {
      console.error("Lỗi khi phân tích Mã Khách Hàng cuối cùng:", error);
    }
  }

  const newIdNumber = lastIdNumber + 1;
  return prefix + String(newIdNumber).padStart(paddingLength, '0');
}

// =============================================================
// HÀM THÊM KHÁCH HÀNG (CREATE)
// =============================================================
const createCustomer = async (req, res) => {
  const { hoTen, ngaySinh, gioiTinh, soDienThoai, diaChi } = req.body;

  try {
    // Kiểm tra xem khách hàng đã tồn tại (chỉ những khách hàng chưa bị xóa mềm)
    const existingCustomer = await db.KhachHang.findOne({
      where: { SoDienThoai: soDienThoai, isDeleted: false }
    });

    if (existingCustomer) {
      return res.status(409).json({ error: 'Số điện thoại này đã tồn tại.' });
    }

    // Tạo khách hàng mới
    const newMaKhachHang = await generateNewCustomerId();

    const newCustomer = await db.KhachHang.create({
      MaKhachHang: newMaKhachHang,
      HoVaTen: hoTen,
      NgaySinh: ngaySinh,
      GioiTinh: gioiTinh,
      SoDienThoai: soDienThoai,
      DiaChi: diaChi
      // TongNo sẽ tự động là 0 (theo Model)
    });

    res.status(201).json({ message: 'Tạo khách hàng thành công!', customer: newCustomer });

  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Số điện thoại này đã tồn tại.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
};

// =============================================================
// HÀM LẤY DANH SÁCH KHÁCH HÀNG (READ - GET)
// =============================================================
const getCustomers = async (req, res) => {
  try {
    // 1. Lấy khách hàng chưa bị xóa từ database
    const allCustomers = await db.KhachHang.findAll({
        where: { isDeleted: false }, // Chỉ lấy những khách hàng chưa bị xóa
        raw: true // Lấy dữ liệu dạng JSON thuần
    });

    // 2. QUAN TRỌNG: trả về JSON
    return res.status(200).json(allCustomers);

} catch (err) {
    console.error('Lỗi khi lấy dữ liệu khách hàng:', err);
    // Trả về lỗi dạng JSON để frontend bắt được và hiện Toast lỗi
    return res.status(500).json({ error: 'Lỗi Server' });
}

}

// =============================================================
// HÀM SỬA KHÁCH HÀNG (UPDATE - PATCH)
// =============================================================
const updateCustomer = async (req, res) => {
  const maKH = req.params.maKH;
  const data = req.body;

  try {
    const customer = await db.KhachHang.findByPk(maKH);
    if (!customer) {
      return res.status(404).json({ error: 'Không tìm thấy khách hàng.' });
    }

    // Cập nhật các trường được gửi lên
    customer.HoVaTen = data.hoTen || customer.HoVaTen;
    customer.NgaySinh = data.ngaySinh || customer.NgaySinh;
    customer.GioiTinh = data.gioiTinh || customer.GioiTinh;
    customer.SoDienThoai = data.soDienThoai || customer.SoDienThoai;
    customer.DiaChi = data.diaChi || customer.DiaChi;

    await customer.save();
    res.status(200).json({ message: 'Cập nhật khách hàng thành công!', customer: customer });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
};

// =============================================================
// HÀM XÓA KHÁCH HÀNG (SOFT DELETE)
// =============================================================
const deleteCustomer = async (req, res) => {
  const maKH = req.params.maKH;

  try {
    const customer = await db.KhachHang.findByPk(maKH);
    if (!customer) {
      return res.status(404).json({ error: 'Không tìm thấy khách hàng.' });
    }

    // Kiểm tra nếu khách hàng đã bị xóa rồi
    if (customer.isDeleted) {
      return res.status(400).json({ error: 'Khách hàng này đã bị xóa trước đó.' });
    }

    // Soft delete: đánh dấu isDeleted = true thay vì xóa thật
    // Thêm suffix vào trường unique để tránh trùng khi thêm mới
    const deletedSuffix = `_deleted_${Date.now()}`;
    if (customer.SoDienThoai && !customer.SoDienThoai.includes('_deleted_')) {
      customer.SoDienThoai = customer.SoDienThoai + deletedSuffix;
    }
    customer.isDeleted = true;
    await customer.save();
    
    res.status(200).json({ message: 'Xóa khách hàng thành công!' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
};

// =============================================================
// HÀM LẤY DANH SÁCH KHÁCH HÀNG ĐÃ XÓA (ADMIN ONLY)
// =============================================================
const getDeletedCustomers = async (req, res) => {
  try {
    const customers = await db.KhachHang.findAll({
      where: { isDeleted: true },
      raw: true,
    });
    res.status(200).json(customers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
};

// =============================================================
// HÀM KHÔI PHỤC KHÁCH HÀNG ĐÃ XÓA (ADMIN ONLY)
// =============================================================
const restoreCustomer = async (req, res) => {
  const maKH = req.params.maKH;

  try {
    const customer = await db.KhachHang.findByPk(maKH);
    if (!customer) {
      return res.status(404).json({ error: 'Không tìm thấy khách hàng.' });
    }

    if (!customer.isDeleted) {
      return res.status(400).json({ error: 'Khách hàng này chưa bị xóa.' });
    }

    // Khôi phục giá trị gốc của trường unique (loại bỏ suffix _deleted_xxx)
    if (customer.SoDienThoai && customer.SoDienThoai.includes('_deleted_')) {
      const originalSoDT = customer.SoDienThoai.split('_deleted_')[0];
      // Kiểm tra xem số điện thoại gốc có bị trùng không
      const existingCustomer = await db.KhachHang.findOne({
        where: { 
          SoDienThoai: originalSoDT, 
          isDeleted: false,
          MaKhachHang: { [db.Sequelize.Op.ne]: maKH }
        }
      });
      if (existingCustomer) {
        return res.status(400).json({ 
          error: `Không thể khôi phục! Số điện thoại ${originalSoDT} đã được sử dụng bởi khách hàng khác.` 
        });
      }
      customer.SoDienThoai = originalSoDT;
    }

    customer.isDeleted = false;
    await customer.save();
    
    res.status(200).json({ message: 'Khôi phục khách hàng thành công!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
};

// =============================================================
// HÀM XÓA VĨNH VIỄN KHÁCH HÀNG (ADMIN ONLY - HARD DELETE)
// =============================================================
const hardDeleteCustomer = async (req, res) => {
  const maKH = req.params.maKH;

  try {
    const customer = await db.KhachHang.findByPk(maKH);
    if (!customer) {
      return res.status(404).json({ error: 'Không tìm thấy khách hàng.' });
    }

    // Chỉ cho phép xóa vĩnh viễn những khách hàng đã soft delete
    if (!customer.isDeleted) {
      return res.status(400).json({ 
        error: 'Chỉ có thể xóa vĩnh viễn khách hàng đã được xóa mềm trước đó.' 
      });
    }

    await customer.destroy();
    res.status(200).json({ message: 'Đã xóa vĩnh viễn khách hàng khỏi hệ thống!' });
  } catch (err) {
    if (err.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({
        error: 'Xóa thất bại! Khách hàng này có dữ liệu liên quan trong hệ thống.',
      });
    }
    console.error(err);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
};

module.exports = {
  createCustomer,
  getCustomers,
  getDeletedCustomers,
  updateCustomer,
  deleteCustomer,
  restoreCustomer,
  hardDeleteCustomer
};