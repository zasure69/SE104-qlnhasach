// controllers/billController.js
const db = require("../models");
const {
  HoaDon,
  CT_HD,
  Sach,
  KhachHang,
  NhanVien,
  sequelize,
  DauSach,
  TheLoai,
  CT_PNS,
  ThamSo,
} = db;

// =============================================================
//  API: LẤY THÔNG TIN KHÁCH HÀNG (GET /api/bill/customer/:id)
// =============================================================
async function getMinStockRule() {
  try {
    // Lấy tham số SoLuongTonToiThieuSauKhiBan từ database
    const rule = await ThamSo.findOne({
      where: { TenThamSo: "SoLuongTonToiThieuSauKhiBan" },
    });
    return rule ? parseInt(rule.GiaTri) : 20; // Mặc định là 20 nếu chưa cấu hình
  } catch (e) {
    console.error("Lỗi khi lấy tham số SoLuongTonToiThieuSauKhiBan:", e);
    return 20; // Mặc định là 20 nếu lỗi
  }
}

const getCustomerInfo = async (req, res) => {
  try {
    const customer = await KhachHang.findOne({
      where: { MaKhachHang: req.params.MaKH, isDeleted: false },
      attributes: ["HoVaTen", "TongNo"],
    });
    if (!customer) {
      return res.status(404).json({ message: "Không tìm thấy khách hàng." });
    }
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi tìm khách hàng." });
  }
};

// =============================================================
//  API: LẤY THÔNG TIN SÁCH (GET /api/bill/book/:id)
// =============================================================
const getBookInfo = async (req, res) => {
  const MaSach = req.params.MaSach;

  try {
    const latestPriceRecord = await CT_PNS.findOne({
      where: { MaSach: MaSach },
      attributes: ["DonGiaBan"],
      order: [["MaPhieuNhap", "DESC"]],
      raw: true,
    });

    const latestPrice = latestPriceRecord ? latestPriceRecord.DonGiaBan : 0;
    const book = await Sach.findOne({
      where: { MaSach: MaSach, isDeleted: false },
      attributes: ["MaSach", "SoLuongTon"],
      include: [
        {
          model: DauSach,
          where: { isDeleted: false },
          attributes: ["TenSach"],
          required: true,
          include: [
            {
              model: TheLoai,
              as: "TheLoai",
              attributes: ["TenTheLoai"],
              required: false,
            },
          ],
        },
      ],
    });

    if (!book) {
      return res.status(404).json({ message: "Không tìm thấy sách." });
    }

    res.json({
      name: book.DauSach.TenSach,
      cat: book.DauSach.TheLoai?.TenTheLoai || "Chưa phân loại",
      price: latestPrice,
      stock: book.SoLuongTon,
    });
  } catch (error) {
    console.error("Lỗi server khi tìm sách:", error);
    res.status(500).json({ message: "Lỗi server khi tìm sách." });
  }
};

// =============================================================
//  API: TẠO HÓA ĐƠN MỚI (POST /api/bill/create)
// =============================================================
const create = async (req, res) => {
  const { MaHoaDon, MaKhachHang, MaNhanVien, TongTien, SoTienTra, ConLai, Details } =
    req.body;
  const t = await sequelize.transaction();

  try {
    const minStock = await getMinStockRule(); // Lấy quy định tồn tối thiểu

    // 1. KIỂM TRA TỒN KHO VÀ QUY ĐỊNH
    for (const detail of Details) {
      const sach = await Sach.findByPk(detail.MaSach, { transaction: t });

      if (!sach) {
        throw new Error(`Sách có mã ${detail.MaSach} không tồn tại.`);
      }

      const currentStock = sach.SoLuongTon;
      const sellQty = parseInt(detail.SoLuongBan);
      const remainingStock = currentStock - sellQty;

      // Kiểm tra 1: Không đủ sách để bán
      if (remainingStock < 0) {
        throw new Error(
          `Sách "${sach.TenSach}" chỉ còn ${currentStock}, không đủ để bán ${sellQty}.`
        );
      }

      // Kiểm tra 2: Vi phạm quy định tồn tối thiểu (Sau khi bán phải còn >= minStock)
      if (remainingStock < minStock) {
        throw new Error(
          `Không thể bán sách "${sach.TenSach}". ` +
            `Tồn kho hiện tại: ${currentStock}. ` +
            `Sau khi bán ${sellQty} sẽ còn ${remainingStock}, thấp hơn quy định tối thiểu (${minStock}).`
        );
      }
    }

    // 2. TẠO HÓA ĐƠN
    await HoaDon.create(
      {
        MaHoaDon,
        NgayLapHoaDon: new Date(),
        MaKhachHang,
        MaNhanVien,
        TongTien,
        SoTienTra,
        ConLai,
      },
      { transaction: t }
    );

    // 3. TẠO CHI TIẾT & TRỪ KHO
    for (const detail of Details) {
      // Tạo chi tiết
      await CT_HD.create(
        {
          MaHoaDon,
          MaSach: detail.MaSach,
          SoLuongBan: detail.SoLuongBan,
          DonGiaBan: detail.DonGiaBan,
          ThanhTien: detail.ThanhTien,
        },
        { transaction: t }
      );

      // Trừ kho (Đã kiểm tra an toàn ở bước 1)
      await Sach.increment("SoLuongTon", {
        by: -parseInt(detail.SoLuongBan),
        where: { MaSach: detail.MaSach },
        transaction: t,
      });
    }

    // 4. CẬP NHẬT NỢ KHÁCH HÀNG
    if (parseFloat(ConLai) > 0) {
      await KhachHang.increment("TongNo", {
        by: parseFloat(ConLai),
        where: { MaKhachHang },
        transaction: t,
      });
    }

    await t.commit();
    res.json({ message: `Lập hóa đơn ${MaHoaDon} thành công!` });
  } catch (error) {
    await t.rollback();
    console.error("Lỗi lập hóa đơn:", error);
    res.status(400).json({ message: error.message }); // Trả về thông báo lỗi cụ thể (số lượng tồn...)
  }
};

// =============================================================
//  API: LẤY CHI TIẾT HÓA ĐƠN (GET /api/bill/detail/:id)
// =============================================================
const getDetail = async (req, res) => {
  const MaHD = req.params.MaHD;

  try {
    const HoaDonData = await HoaDon.findOne({
      where: { MaHoaDon: MaHD },
      // Chọn các trường cụ thể của HoaDon để tránh lỗi
      attributes: [
        "MaHoaDon",
        "NgayLapHoaDon",
        "MaKhachHang",
        "MaNhanVien",
        "TongTien",
        "SoTienTra",
        "ConLai",
      ],
      include: [
        {
          model: KhachHang,
          // Chỉ lấy tên khách hàng
          attributes: ["HoVaTen"],
        },
        {
          model: NhanVien,
          // Lấy thông tin nhân viên
          attributes: ["MaNhanVien", "HoTen"],
        },
        {
          model: CT_HD,
          as: "CT_HDs", // PHẢI KHỚP với alias đã định nghĩa trong index.js
          // Chỉ lấy các trường cần thiết của CT_HD
          attributes: ["MaSach", "SoLuongBan", "DonGiaBan", "ThanhTien"],
          include: [
            {
              model: Sach,
              // Chỉ lấy thông tin Sách cần thiết (ví dụ: MaSach, giá)
              attributes: ["MaSach", "SoLuongTon"], // Thêm các thuộc tính khác của Sach nếu cần
              include: [
                {
                  model: DauSach,
                  // CHỈ LẤY TRƯỜNG CỤ THỂ BẠN CẦN (TenDauSach)
                  attributes: ["TenSach"],
                  required: true,
                  include: [
                    {
                      model: TheLoai,
                      attributes: ["TenTheLoai"],
                      required: true,
                    },
                  ],
                },
              ],
              required: true, // Bắt buộc phải có Sach
            },
          ],
          required: true, // Bắt buộc phải có CT_HD
        },
      ],
    });

    if (!HoaDonData) {
      return res.status(404).json({ message: "Không tìm thấy hóa đơn." });
    }

    // Trả về dữ liệu
    res.json({
      HoaDon: HoaDonData,
      Details: HoaDonData.Details,
    });
  } catch (error) {
    console.error("Lỗi truy vấn chi tiết hóa đơn:", error);
    res.status(500).json({
      message: "Lỗi Server khi lấy chi tiết hóa đơn.",
      error: error.message, // Trả về thông báo lỗi chi tiết để debug
    });
  }
};

// =============================================================
//  API: CHỈNH SỬA HÓA ĐƠN (PUT /api/bill/:id)
// =============================================================
const updateBill = async (req, res) => {
  const MaHD = req.params.MaHD;
  const { MaKhachHang, TongTien, SoTienTra, ConLai, Details } = req.body;
  const t = await sequelize.transaction();

  try {
    const minStock = await getMinStockRule();

    // --- BƯỚC 1: HOÀN TÁC DỮ LIỆU CŨ ---
    const oldBill = await HoaDon.findByPk(MaHD, { transaction: t });
    if (!oldBill) throw new Error("Hóa đơn không tồn tại.");

    const oldDetails = await CT_HD.findAll({
      where: { MaHoaDon: MaHD },
      transaction: t,
    });

    // 1.1. Trả lại sách vào kho (Hoàn tác tồn kho)
    for (const detail of oldDetails) {
      await Sach.increment("SoLuongTon", {
        by: detail.SoLuongBan, // Cộng lại số lượng đã bán
        where: { MaSach: detail.MaSach },
        transaction: t,
      });
    }

    // 1.2. Hoàn tác nợ cũ
    if (oldBill.ConLai > 0) {
      await KhachHang.increment("TongNo", {
        by: -parseFloat(oldBill.ConLai),
        where: { MaKhachHang: oldBill.MaKhachHang },
        transaction: t,
      });
    }

    // 1.3. Xóa chi tiết cũ
    await CT_HD.destroy({ where: { MaHoaDon: MaHD }, transaction: t });

    // --- BƯỚC 2: KIỂM TRA & ÁP DỤNG DỮ LIỆU MỚI ---
    // Lúc này, kho đã đầy đủ như chưa từng bán hóa đơn này. Ta kiểm tra quy định lại từ đầu.

    for (const detail of Details) {
      const sellQty = parseInt(detail.SoLuongBan);

      // Lấy lại thông tin sách mới nhất (sau khi đã được hoàn tác ở bước 1.1)
      const sach = await Sach.findByPk(detail.MaSach, { transaction: t });

      if (!sach) throw new Error(`Sách ${detail.MaSach} không tồn tại.`);

      const currentStock = sach.SoLuongTon; // Đây là tồn kho thực tế + số lượng vừa trả lại
      const remainingStock = currentStock - sellQty;
      const dausach = await DauSach.findByPk(sach.MaDauSach, {
        transaction: t,
      });
      const tensach = dausach.TenSach;

      // Kiểm tra tồn tối thiểu
      if (remainingStock < minStock) {
        throw new Error(
          `Không thể cập nhật sách "${tensach}". ` +
            `Tồn kho thực tế: ${currentStock}. ` +
            `Bán ${sellQty} cuốn sẽ còn ${remainingStock} (Quy định tối thiểu: ${minStock}).`
        );
      }

      // Nếu thỏa mãn -> Trừ kho lại
      await Sach.increment("SoLuongTon", {
        by: -sellQty,
        where: { MaSach: detail.MaSach },
        transaction: t,
      });
    }

    // --- BƯỚC 3: CẬP NHẬT HÓA ĐƠN & CHI TIẾT MỚI ---

    // 3.1. Tạo chi tiết mới
    const newDetailsData = Details.map((d) => ({
      MaHoaDon: MaHD,
      MaSach: d.MaSach,
      SoLuongBan: d.SoLuongBan,
      DonGiaBan: d.DonGiaBan,
      ThanhTien: d.ThanhTien,
    }));
    await CT_HD.bulkCreate(newDetailsData, { transaction: t });

    // 3.2. Cập nhật thông tin chính Hóa Đơn
    await HoaDon.update(
      {
        MaKhachHang,
        TongTien,
        SoTienTra,
        ConLai,
      },
      { where: { MaHoaDon: MaHD }, transaction: t }
    );

    // 3.3. Cập nhật nợ mới
    if (parseFloat(ConLai) > 0) {
      await KhachHang.increment("TongNo", {
        by: parseFloat(ConLai),
        where: { MaKhachHang },
        transaction: t,
      });
    }

    await t.commit();
    res.json({ message: "Cập nhật hóa đơn thành công!" });
  } catch (error) {
    await t.rollback();
    console.error("Lỗi cập nhật hóa đơn:", error);
    res.status(400).json({ message: error.message });
  }
};

// =============================================================
//  API: XÓA HÓA ĐƠN (SOFT DELETE)
// =============================================================
const deleteBill = async (req, res) => {
  const MaHD = req.params.MaHD;
  const t = await sequelize.transaction(); // Bắt đầu Transaction

  try {
    // 1. Tìm Hóa đơn và Chi tiết cũ
    const bill = await HoaDon.findByPk(MaHD, { transaction: t });
    if (!bill) {
      await t.rollback();
      return res.status(404).json({ message: "Không tìm thấy hóa đơn." });
    }

    // Kiểm tra nếu hóa đơn đã bị xóa rồi
    if (bill.isDeleted) {
      await t.rollback();
      return res.status(400).json({ message: "Hóa đơn này đã bị xóa trước đó." });
    }

    const details = await CT_HD.findAll({
      where: { MaHoaDon: MaHD },
      transaction: t,
    });

    // 2. HOÀN TÁC TỒN KHO (Cộng lại số lượng sách đã bán vào kho)
    for (const item of details) {
      await Sach.increment("SoLuongTon", {
        by: item.SoLuongBan,
        where: { MaSach: item.MaSach },
        transaction: t,
      });
    }

    // 3. HOÀN TÁC NỢ KHÁCH HÀNG (Nếu hóa đơn này có ghi nợ, phải trừ nợ đi)
    // Logic: Khi xóa hóa đơn, coi như giao dịch chưa từng xảy ra -> Trả lại trạng thái nợ cũ
    const conLai = parseFloat(bill.ConLai);
    if (conLai > 0) {
      await KhachHang.increment("TongNo", {
        by: -conLai, // Giảm nợ
        where: { MaKhachHang: bill.MaKhachHang },
        transaction: t,
      });
    }

    // 4. Soft delete: đánh dấu isDeleted = true thay vì xóa thật
    await HoaDon.update(
      { isDeleted: true },
      { where: { MaHoaDon: MaHD }, transaction: t }
    );

    await t.commit();
    res.json({
      message: `Đã xóa hóa đơn ${MaHD} và hoàn tác tồn kho/nợ thành công.`,
    });
  } catch (error) {
    await t.rollback();
    console.error("Lỗi khi xóa hóa đơn:", error);
    res.status(500).json({ message: `Lỗi server: ${error.message}` });
  }
};

const getLastMaHD = async (req, res) => {
  try {
    const lastBill = await HoaDon.findOne({
      attributes: ["MaHoaDon"],
      // Sắp xếp giảm dần theo MaHoaDon (vì MaHD là chuỗi 'HD001', 'HD002',...)
      order: [["MaHoaDon", "DESC"]],
      limit: 1,
      raw: true,
    });

    // Trả về MaHoaDon lớn nhất hoặc null nếu chưa có hóa đơn nào
    res.json({ lastMaHD: lastBill ? lastBill.MaHoaDon : null });
  } catch (error) {
    console.error("Lỗi server khi lấy Mã Hóa Đơn cuối cùng:", error);
    res
      .status(500)
      .json({ message: "Lỗi server khi lấy Mã Hóa Đơn cuối cùng." });
  }
};

// =====================================================
// ADMIN ONLY: LẤY DANH SÁCH HÓA ĐƠN ĐÃ XÓA
// =====================================================
const getDeletedBills = async (req, res) => {
  try {
    const bills = await HoaDon.findAll({
      where: { isDeleted: true },
      include: [
        { model: KhachHang, attributes: ["HoVaTen"] },
        { model: CT_HD, as: "ChiTietHoaDon" },
      ],
      order: [["NgayLapHoaDon", "DESC"]],
    });
    res.status(200).json({ bills });
  } catch (error) {
    console.error("[billController] getDeletedBills error:", error);
    res.status(500).json({ message: "Lỗi server nội bộ" });
  }
};

// =====================================================
// ADMIN ONLY: KHÔI PHỤC HÓA ĐƠN ĐÃ XÓA
// =====================================================
const restoreBill = async (req, res) => {
  const MaHD = req.params.MaHD;
  const t = await sequelize.transaction();

  try {
    const bill = await HoaDon.findByPk(MaHD, { transaction: t });
    if (!bill) {
      await t.rollback();
      return res.status(404).json({ message: "Không tìm thấy hóa đơn." });
    }

    if (!bill.isDeleted) {
      await t.rollback();
      return res.status(400).json({ message: "Hóa đơn này chưa bị xóa." });
    }

    const details = await CT_HD.findAll({
      where: { MaHoaDon: MaHD },
      transaction: t,
    });

    // Khôi phục tồn kho (Trừ lại số lượng sách đã bán)
    for (const item of details) {
      const sach = await Sach.findByPk(item.MaSach, { transaction: t });
      if (sach) {
        const newStock = sach.SoLuongTon - item.SoLuongBan;
        if (newStock < 0) {
          await t.rollback();
          return res.status(400).json({ 
            message: `Không thể khôi phục. Sách ${item.MaSach} không đủ tồn kho.` 
          });
        }
        await Sach.decrement("SoLuongTon", {
          by: item.SoLuongBan,
          where: { MaSach: item.MaSach },
          transaction: t,
        });
      }
    }

    // Khôi phục nợ khách hàng
    const conLai = parseFloat(bill.ConLai);
    if (conLai > 0) {
      await KhachHang.increment("TongNo", {
        by: conLai,
        where: { MaKhachHang: bill.MaKhachHang },
        transaction: t,
      });
    }

    // Khôi phục hóa đơn
    await HoaDon.update(
      { isDeleted: false },
      { where: { MaHoaDon: MaHD }, transaction: t }
    );

    await t.commit();
    res.json({ message: `Đã khôi phục hóa đơn ${MaHD} thành công.` });
  } catch (error) {
    await t.rollback();
    console.error("Lỗi khi khôi phục hóa đơn:", error);
    res.status(500).json({ message: `Lỗi server: ${error.message}` });
  }
};

// =====================================================
// ADMIN ONLY: XÓA VĨNH VIỄN HÓA ĐƠN (HARD DELETE)
// =====================================================
const hardDeleteBill = async (req, res) => {
  const MaHD = req.params.MaHD;
  const t = await sequelize.transaction();

  try {
    const bill = await HoaDon.findByPk(MaHD, { transaction: t });
    if (!bill) {
      await t.rollback();
      return res.status(404).json({ message: "Không tìm thấy hóa đơn." });
    }

    if (!bill.isDeleted) {
      await t.rollback();
      return res.status(400).json({ 
        message: "Chỉ có thể xóa vĩnh viễn hóa đơn đã được xóa mềm trước đó." 
      });
    }

    // Xóa chi tiết hóa đơn trước
    await CT_HD.destroy({
      where: { MaHoaDon: MaHD },
      transaction: t,
    });

    // Xóa hóa đơn
    await bill.destroy({ transaction: t });

    await t.commit();
    res.json({ message: `Đã xóa vĩnh viễn hóa đơn ${MaHD} khỏi hệ thống.` });
  } catch (error) {
    await t.rollback();
    console.error("Lỗi khi xóa vĩnh viễn hóa đơn:", error);
    res.status(500).json({ message: `Lỗi server: ${error.message}` });
  }
};

module.exports = {
  getCustomerInfo,
  getBookInfo,
  create,
  getDetail,
  updateBill,
  deleteBill,
  getDeletedBills,
  restoreBill,
  hardDeleteBill,
  getLastMaHD,
};
