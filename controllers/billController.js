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
async function getRules() {
  try {
    const minStockRule = await db.ThamSo.findOne({
      where: { TenThamSo: "SoLuongTonToiThieu" },
    });
    const maxDebtRule = await db.ThamSo.findOne({
      where: { TenThamSo: "SoTienNoToiDa" },
    });

    return {
      minStock: minStockRule ? parseInt(minStockRule.GiaTri) : 20, // Mặc định 20
      maxDebt: maxDebtRule ? parseFloat(maxDebtRule.GiaTri) : 20000, // Mặc định 20.000
    };
  } catch (e) {
    return { minStock: 0, maxDebt: 999999999 };
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
  const { MaHoaDon, MaKhachHang, TongTien, SoTienTra, ConLai, Details } =
    req.body;
  const t = await sequelize.transaction();

  try {
    const { minStock, maxDebt } = await getRules(); // Lấy quy định
    const noPhatSinh = parseFloat(ConLai); // Số tiền nợ thêm từ hóa đơn này

    // 1. KIỂM TRA QUY ĐỊNH NỢ TỐI ĐA
    // Lấy thông tin khách hàng để biết nợ hiện tại
    const khachHang = await KhachHang.findByPk(MaKhachHang, {
      attributes: ["TongNo", "HoVaTen"],
      transaction: t,
    });

    if (!khachHang) {
      throw new Error("Khách hàng không tồn tại.");
    }

    const noHienTai = parseFloat(khachHang.TongNo);
    const tongNoSauKhiMua = noHienTai + noPhatSinh;

    if (tongNoSauKhiMua > maxDebt) {
      throw new Error(
        `Không thể lập hóa đơn! Khách hàng ${
          khachHang.HoVaTen
        } đang nợ ${new Intl.NumberFormat("vi-VN").format(noHienTai)}. ` +
          `Nếu nợ thêm ${new Intl.NumberFormat("vi-VN").format(
            noPhatSinh
          )} sẽ vượt quá giới hạn nợ tối đa (${new Intl.NumberFormat(
            "vi-VN"
          ).format(maxDebt)}).`
      );
    }

    // 2. KIỂM TRA TỒN KHO (Giữ nguyên logic cũ)
    for (const detail of Details) {
      const sach = await Sach.findByPk(detail.MaSach, { transaction: t });
      if (!sach) throw new Error(`Sách ${detail.MaSach} không tồn tại.`);

      const currentStock = sach.SoLuongTon;
      const sellQty = parseInt(detail.SoLuongBan);
      const remainingStock = currentStock - sellQty;

      if (remainingStock < 0)
        throw new Error(
          `Sách "${sach.TenSach}" không đủ số lượng (Còn: ${currentStock}).`
        );

      if (remainingStock < minStock) {
        throw new Error(
          `Bán sách "${sach.TenSach}" sẽ vi phạm quy định tồn tối thiểu (Sau khi bán còn ${remainingStock} < ${minStock}).`
        );
      }
    }

    // 3. TẠO HÓA ĐƠN & CHI TIẾT
    await HoaDon.create(
      {
        MaHoaDon,
        NgayLapHoaDon: new Date(),
        MaKhachHang,
        TongTien,
        SoTienTra,
        ConLai,
      },
      { transaction: t }
    );

    for (const detail of Details) {
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

      await Sach.increment("SoLuongTon", {
        by: -parseInt(detail.SoLuongBan),
        where: { MaSach: detail.MaSach },
        transaction: t,
      });
    }

    // 4. CẬP NHẬT NỢ
    if (noPhatSinh > 0) {
      await KhachHang.increment("TongNo", {
        by: noPhatSinh,
        where: { MaKhachHang },
        transaction: t,
      });
    }

    await t.commit();
    res.json({ message: `Lập hóa đơn ${MaHoaDon} thành công!` });
  } catch (error) {
    await t.rollback();
    console.error("Lỗi lập hóa đơn:", error);
    res.status(400).json({ message: error.message });
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
      paranoid: false, // Cho phép lấy cả hóa đơn đã xóa (trong thùng rác)
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
          // Không dùng alias vì model index.js không định nghĩa alias
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
                      // Không dùng alias vì model không định nghĩa alias
                      attributes: ["TenTheLoai"],
                      required: false, // Cho phép sách không có thể loại
                    },
                  ],
                },
              ],
              required: true, // Bắt buộc phải có Sach
            },
          ],
          required: false, // Cho phép hóa đơn không có chi tiết (trường hợp hiếm)
        },
      ],
    });

    if (!HoaDonData) {
      return res.status(404).json({ message: "Không tìm thấy hóa đơn." });
    }

    // Trả về dữ liệu - dùng cả "bill" và "HoaDon" để tương thích với các view khác nhau
    res.json({
      bill: HoaDonData,
      HoaDon: HoaDonData,
      Details: HoaDonData.CT_HDs,
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
    const { minStock, maxDebt } = await getRules();
    const noMoiPhatSinh = parseFloat(ConLai); // Nợ MỚI của hóa đơn

    // --- BƯỚC 1: LẤY DỮ LIỆU CŨ & HOÀN TÁC ---
    const oldBill = await HoaDon.findByPk(MaHD, { transaction: t });
    if (!oldBill) throw new Error("Hóa đơn không tồn tại.");

    const oldDetails = await CT_HD.findAll({
      where: { MaHoaDon: MaHD },
      transaction: t,
    });

    // 1.1 Hoàn tác kho
    for (const detail of oldDetails) {
      await Sach.increment("SoLuongTon", {
        by: detail.SoLuongBan,
        where: { MaSach: detail.MaSach },
        transaction: t,
      });
    }

    // 1.2 Tính toán lại nợ GỐC (Nợ thực tế trước khi có hóa đơn này)
    // Logic: Lấy Tổng Nợ hiện tại trong DB TRỪ đi Nợ Cũ của hóa đơn này
    const khachHang = await KhachHang.findByPk(oldBill.MaKhachHang, {
      attributes: ["TongNo", "HoVaTen"],
      transaction: t,
    });
    const noHienTaiTrongDB = parseFloat(khachHang.TongNo);
    const noCuCuaHoaDon = parseFloat(oldBill.ConLai);

    const noGocThucTe = noHienTaiTrongDB - noCuCuaHoaDon; // Đây là nợ của khách nếu không tính hóa đơn này

    // --- BƯỚC 2: KIỂM TRA QUY ĐỊNH NỢ ---
    // Nợ Dự Kiến = Nợ Gốc + Nợ Mới
    const tongNoDuKien = noGocThucTe + noMoiPhatSinh;

    if (tongNoDuKien > maxDebt) {
      throw new Error(
        `Cập nhật thất bại! Tổng nợ dự kiến (${new Intl.NumberFormat(
          "vi-VN"
        ).format(tongNoDuKien)}) ` +
          `sẽ vượt quá giới hạn nợ tối đa (${new Intl.NumberFormat(
            "vi-VN"
          ).format(maxDebt)}).`
      );
    }

    // --- BƯỚC 3: KIỂM TRA KHO & ÁP DỤNG MỚI ---
    // Xóa chi tiết cũ
    await CT_HD.destroy({ where: { MaHoaDon: MaHD }, transaction: t });

    // Kiểm tra tồn kho mới và trừ kho
    for (const detail of Details) {
      const sellQty = parseInt(detail.SoLuongBan);
      const sach = await Sach.findByPk(detail.MaSach, { transaction: t });

      // Lưu ý: Lúc này kho đã được hoàn tác (cộng lại) ở Bước 1.1
      const currentStock = sach.SoLuongTon;
      const remainingStock = currentStock - sellQty;

      if (remainingStock < minStock) {
        throw new Error(
          `Sách "${sach.TenSach}" không đủ điều kiện tồn tối thiểu (Sau bán còn ${remainingStock} < ${minStock}).`
        );
      }

      await Sach.increment("SoLuongTon", {
        by: -sellQty,
        where: { MaSach: detail.MaSach },
        transaction: t,
      });
    }

    // --- BƯỚC 4: CẬP NHẬT HÓA ĐƠN & NỢ KHÁCH HÀNG ---

    // Tạo chi tiết mới
    const newDetailsData = Details.map((d) => ({
      MaHoaDon: MaHD,
      MaSach: d.MaSach,
      SoLuongBan: d.SoLuongBan,
      DonGiaBan: d.DonGiaBan,
      ThanhTien: d.ThanhTien,
    }));
    await CT_HD.bulkCreate(newDetailsData, { transaction: t });

    // Update Hóa Đơn
    await HoaDon.update(
      { MaKhachHang, TongTien, SoTienTra, ConLai },
      { where: { MaHoaDon: MaHD }, transaction: t }
    );

    // Cập nhật Nợ Khách Hàng (Dựa trên chênh lệch)
    // Cách tính: Update lại Tổng Nợ = Nợ Gốc + Nợ Mới
    // Vì nãy ta chưa trừ nợ cũ trong DB, nên ta dùng hàm update trực tiếp set giá trị mới cho chuẩn
    await KhachHang.update(
      { TongNo: tongNoDuKien },
      { where: { MaKhachHang: oldBill.MaKhachHang }, transaction: t }
    );

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
      return res
        .status(400)
        .json({ message: "Hóa đơn này đã bị xóa trước đó." });
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
        {
          model: KhachHang,
          attributes: ["MaKhachHang", "HoVaTen", "isDeleted"],
        },
        { model: CT_HD, as: "ChiTietHoaDon" },
      ],
      order: [["NgayLapHoaDon", "DESC"]],
    });

    const result = bills.map((bill) => {
      const plain = bill.get({ plain: true });
      return {
        ...plain,
        isKhachHangDeleted: plain.KhachHang ? plain.KhachHang.isDeleted : false,
      };
    });

    res.status(200).json({ bills: result });
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
  const restoreKhachHangToo = req.query.restoreKhachHang === "true";
  const t = await sequelize.transaction();

  try {
    const bill = await HoaDon.findByPk(MaHD, {
      include: [
        {
          model: KhachHang,
          attributes: ["MaKhachHang", "HoVaTen", "isDeleted"],
        },
      ],
      transaction: t,
    });

    if (!bill) {
      await t.rollback();
      return res.status(404).json({ message: "Không tìm thấy hóa đơn." });
    }

    if (!bill.isDeleted) {
      await t.rollback();
      return res.status(400).json({ message: "Hóa đơn này chưa bị xóa." });
    }

    // Kiểm tra xem khách hàng liên kết có bị xóa không
    if (bill.KhachHang && bill.KhachHang.isDeleted) {
      if (!restoreKhachHangToo) {
        await t.rollback();
        return res.status(409).json({
          error: "Khách hàng liên kết đã bị xóa",
          requireKhachHangRestore: true,
          khachHangInfo: {
            MaKhachHang: bill.KhachHang.MaKhachHang,
            HoVaTen: bill.KhachHang.HoVaTen,
          },
          message: `Khách hàng "${bill.KhachHang.HoVaTen}" liên kết với hóa đơn này đã bị xóa. Bạn có muốn khôi phục cả khách hàng không?`,
        });
      }

      // Khôi phục khách hàng trước
      await KhachHang.update(
        { isDeleted: false },
        { where: { MaKhachHang: bill.KhachHang.MaKhachHang }, transaction: t }
      );
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
            message: `Không thể khôi phục. Sách ${item.MaSach} không đủ tồn kho.`,
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

    const successMessage =
      restoreKhachHangToo && bill.KhachHang?.isDeleted
        ? `Đã khôi phục hóa đơn ${MaHD} và khách hàng "${bill.KhachHang.HoVaTen}" thành công.`
        : `Đã khôi phục hóa đơn ${MaHD} thành công.`;

    res.json({ message: successMessage });
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
        message: "Chỉ có thể xóa vĩnh viễn hóa đơn đã được xóa mềm trước đó.",
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
