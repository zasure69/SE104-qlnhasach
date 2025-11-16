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
// HÀM XÓA KHÁCH HÀNG (DELETE)
// =============================================================
const deleteCustomer = async (req, res) => {
  const maKH = req.params.maKH;

  try {
    const customer = await db.KhachHang.findByPk(maKH);
    if (!customer) {
      return res.status(404).json({ error: 'Không tìm thấy khách hàng.' });
    }

    await customer.destroy();
    res.status(200).json({ message: 'Xóa khách hàng thành công!' });

  } catch (err) {
    // Xử lý lỗi nếu khách hàng này có Hóa đơn (không thể xóa)
    if (err.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({ error: 'Xóa thất bại! Khách hàng này đã có hóa đơn hoặc phiếu thu.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
};

module.exports = {
  createCustomer,
  updateCustomer,
  deleteCustomer
};