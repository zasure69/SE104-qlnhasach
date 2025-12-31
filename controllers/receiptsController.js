// controllers/receiptsController.js
const db = require("../models");
const { PhieuThuTien, KhachHang, NhanVien, ThamSo, sequelize } = db;
const { Op } = require("sequelize"); // Cần cho các truy vấn phức tạp


async function getRules() {
  try {
      const checkDebtRule = await ThamSo.findOne({ where: { TenThamSo: 'ApDungQDKiemTraTienNo' } });
      
      return {
          allowOverpay: checkDebtRule ? parseInt(checkDebtRule.GiaTri) : false 
      };
  } catch (e) {
      return { allowOverpay: false };
  }
}
// =============================================================
//  API: LẤY THÔNG TIN KHÁCH HÀNG (GET /api/receipts/customer/:MaKH)
// =============================================================
const getCustomerInfo = async (req, res) => {
  try {
    const customer = await KhachHang.findOne({
      where: { MaKhachHang: req.params.MaKH, isDeleted: false },
      attributes: ["MaKhachHang", "HoVaTen", "DiaChi", "SoDienThoai", "TongNo"],
    });
    if (!customer) {
      return res.status(404).json({ message: "Không tìm thấy khách hàng." });
    }
    res.json(customer);
  } catch (error) {
    console.error("Lỗi server khi tìm khách hàng:", error);
    res.status(500).json({ message: "Lỗi server khi tìm khách hàng." });
  }
};

// =============================================================
//  API: LẤY MÃ PHIẾU THU CUỐI CÙNG (GET /api/receipts/lastMaPhieuThu)
// =============================================================
const getLastMaPhieuThu = async (req, res) => {
  try {
    const lastReceipt = await PhieuThuTien.findOne({
      attributes: ["MaPhieuThu"],
      order: [["MaPhieuThu", "DESC"]],
      limit: 1,
      raw: true,
    });

    res.json({ lastMaPhieuThu: lastReceipt ? lastReceipt.MaPhieuThu : null });
  } catch (error) {
    console.error("Lỗi server khi lấy Mã Phiếu Thu cuối cùng:", error);
    res
      .status(500)
      .json({ message: "Lỗi server khi lấy Mã Phiếu Thu cuối cùng." });
  }
};

// =============================================================
//  API: TẠO PHIẾU THU MỚI (POST /api/receipts/create)
// =============================================================
const createReceipt = async (req, res) => {
  const { MaPhieuThu, MaNhanVien, MaKhachHang, NgayThuTien, SoTienThu } =
    req.body;
  const t = await sequelize.transaction();

  try {
    // 1. Kiểm tra Khách hàng (phải tồn tại và chưa bị xóa mềm) và Số tiền thu
    const { allowOverpay } = await getRules();
    const customer = await KhachHang.findOne({
      where: { MaKhachHang: MaKhachHang, isDeleted: false },
      attributes: ["TongNo"],
      transaction: t,
    });
    const thuTien = parseFloat(SoTienThu);

    if (!customer) {
      await t.rollback();
      return res
        .status(404)
        .json({
          message: "Không tìm thấy khách hàng hoặc khách hàng đã bị xóa.",
        });
    }
    if (thuTien <= 0) {
      await t.rollback();
      return res.status(400).json({ message: "Số tiền thu phải lớn hơn 0." });
    }

    // --- CHECK LOGIC MỚI: KHÔNG ĐƯỢC THU QUÁ SỐ NỢ ---
    const currentDebt = parseFloat(customer.TongNo);
    if (allowOverpay === 0) {
      if (thuTien > currentDebt) {
        await t.rollback();
        return res
          .status(400)
          .json({
            message: `Số tiền thu (${thuTien}) không được vượt quá số nợ hiện tại (${currentDebt}).`,
          });
      }
    }
    // ------------------------------------------------
    
    // 2. Tạo Phiếu Thu Tiền
    await PhieuThuTien.create(
      {
        MaPhieuThu,
        MaKhachHang,
        MaNhanVien,
        NgayThuTien,
        SoTienThu: thuTien,
      },
      { transaction: t }
    );

    // 3. Giảm Tổng Nợ của Khách hàng
    await KhachHang.increment("TongNo", {
      by: -thuTien,
      where: { MaKhachHang },
      transaction: t,
    });

    await t.commit();
    const createdReceipt = await PhieuThuTien.findByPk(MaPhieuThu, {
      include: [
        {
          model: KhachHang,
          as: "KhachHang",
          attributes: ["HoVaTen", "DiaChi", "SoDienThoai", "TongNo"],
        },
        {
          model: NhanVien,
          attributes: ["MaNhanVien", "HoTen", "Username"],
        },
      ],
    });

    res.json({
      message: `Lập phiếu thu ${MaPhieuThu} thành công!`,
      receipt: createdReceipt,
    });
  } catch (error) {
    await t.rollback();
    console.error("Lỗi khi lập phiếu thu:", error);
    res
      .status(500)
      .json({ message: `Lỗi server khi lập phiếu thu: ${error.message}` });
  }
};

// =============================================================
//  API: CẬP NHẬT PHIẾU THU (PUT /api/receipts/:MaPhieuThu)
// =============================================================
const updateReceipt = async (req, res) => {
  const MaPhieuThu = req.params.MaPhieuThu;
  const { MaKhachHang, NgayThuTien, SoTienThu } = req.body;
  const t = await sequelize.transaction();

  try {
    const { allowOverpay } = await getRules();
    const newThuTien = parseFloat(SoTienThu);

    // 1. Tìm Phiếu Thu cũ
    const oldReceipt = await PhieuThuTien.findByPk(MaPhieuThu, {
      transaction: t,
    });
    if (!oldReceipt) {
      await t.rollback();
      return res.status(404).json({ message: "Không tìm thấy phiếu thu." });
    }

    const oldThuTien = parseFloat(oldReceipt.SoTienThu);
    
    if (newThuTien <= 0) {
      await t.rollback();
      return res.status(400).json({ message: "Số tiền thu phải lớn hơn 0." });
    }

    const khachHang = await KhachHang.findByPk(oldReceipt.MaKhachHang, { transaction: t });
    const noHienTai = parseFloat(khachHang.TongNo);

    const noGoc = noHienTai + oldThuTien;

    if (allowOverpay === 0) {
      if (newThuTien > noGoc) {
        await t.rollback();
        return res
          .status(400)
          .json({
            message: `Số tiền thu mới (${newThuTien}) không được vượt quá số nợ gốc (${noGoc}).`,
          });
      }
    }

    const newTongNo = noGoc - newThuTien;

    // 2. Hoàn tác và Áp dụng Nợ (Chỉ cập nhật nợ nếu số tiền thay đổi)
    await KhachHang.update(
      { TongNo: newTongNo },
      { where: { MaKhachHang: oldReceipt.MaKhachHang }, transaction: t }
  );

    // 3. Cập nhật Phiếu Thu
    await PhieuThuTien.update(
      {
        MaKhachHang,
        NgayThuTien,
        SoTienThu: newThuTien,
      },
      { where: { MaPhieuThu }, transaction: t }
    );

    await t.commit();
    res.json({ message: `Cập nhật phiếu thu ${MaPhieuThu} thành công!` });
  } catch (error) {
    await t.rollback();
    console.error("Lỗi khi cập nhật phiếu thu:", error);
    res
      .status(500)
      .json({ message: `Lỗi server khi cập nhật phiếu thu: ${error.message}` });
  }
};

// =============================================================
//  API: XÓA PHIẾU THU (SOFT DELETE)
// =============================================================
const deleteReceipt = async (req, res) => {
  const MaPhieuThu = req.params.MaPhieuThu;
  const t = await sequelize.transaction();

  try {
    const receiptToDelete = await PhieuThuTien.findByPk(MaPhieuThu, {
      transaction: t,
    });
    if (!receiptToDelete) {
      await t.rollback();
      return res.status(404).json({ message: "Không tìm thấy phiếu thu." });
    }

    // Kiểm tra nếu phiếu thu đã bị xóa rồi
    if (receiptToDelete.isDeleted) {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "Phiếu thu này đã bị xóa trước đó." });
    }

    const soTienThu = parseFloat(receiptToDelete.SoTienThu);

    // 1. Hoàn tác Nợ (Tăng nợ trở lại cho khách hàng)
    await KhachHang.increment("TongNo", {
      by: soTienThu,
      where: { MaKhachHang: receiptToDelete.MaKhachHang },
      transaction: t,
    });

    // 2. Soft delete: đánh dấu isDeleted = true thay vì xóa thật
    await PhieuThuTien.update(
      { isDeleted: true },
      { where: { MaPhieuThu }, transaction: t }
    );

    await t.commit();
    res.json({ message: `Phiếu thu ${MaPhieuThu} đã được xóa thành công.` });
  } catch (error) {
    await t.rollback();
    console.error("Lỗi khi xóa phiếu thu:", error);
    res
      .status(500)
      .json({ message: `Lỗi server khi xóa phiếu thu: ${error.message}` });
  }
};

const getReceiptDetail = async (req, res) => {
  const MaPhieuThu = req.params.MaPhieuThu;
  try {
    // Lấy chi tiết Phiếu Thu và thông tin Khách hàng, Nhân viên liên quan
    const receipt = await PhieuThuTien.findByPk(MaPhieuThu, {
      include: [
        {
          model: KhachHang,
          as: "KhachHang",
          attributes: ["HoVaTen", "DiaChi", "SoDienThoai", "TongNo"],
        },
        {
          model: NhanVien,
          attributes: ["MaNhanVien", "HoTen"],
        },
      ],
    });

    if (!receipt) {
      return res.status(404).json({ message: "Không tìm thấy phiếu thu." });
    }
    res.json(receipt);
  } catch (error) {
    console.error("Lỗi server khi lấy chi tiết phiếu thu:", error);
    res.status(500).json({ message: "Lỗi server khi lấy chi tiết phiếu thu." });
  }
};

// =====================================================
// ADMIN ONLY: LẤY DANH SÁCH PHIẾU THU ĐÃ XÓA
// =====================================================
const getDeletedReceipts = async (req, res) => {
  try {
    const receipts = await PhieuThuTien.findAll({
      where: { isDeleted: true },
      include: [
        {
          model: KhachHang,
          as: "KhachHang",
          attributes: ["MaKhachHang", "HoVaTen", "TongNo", "isDeleted"],
        },
      ],
      order: [["NgayThuTien", "DESC"]],
    });
    
    const result = receipts.map(receipt => {
      const plain = receipt.get({ plain: true });
      return {
        ...plain,
        isKhachHangDeleted: plain.KhachHang ? plain.KhachHang.isDeleted : false
      };
    });
    
    res.status(200).json({ receipts: result });
  } catch (error) {
    console.error("[receiptsController] getDeletedReceipts error:", error);
    res.status(500).json({ message: "Lỗi server nội bộ" });
  }
};

// =====================================================
// ADMIN ONLY: KHÔI PHỤC PHIẾU THU ĐÃ XÓA
// =====================================================
const restoreReceipt = async (req, res) => {
  const MaPhieuThu = req.params.MaPhieuThu;
  const restoreKhachHangToo = req.query.restoreKhachHang === 'true';
  const t = await sequelize.transaction();

  try {
    const receipt = await PhieuThuTien.findByPk(MaPhieuThu, { 
      include: [{
        model: KhachHang,
        as: 'KhachHang',
        attributes: ['MaKhachHang', 'HoVaTen', 'isDeleted']
      }],
      transaction: t 
    });
    
    if (!receipt) {
      await t.rollback();
      return res.status(404).json({ message: "Không tìm thấy phiếu thu." });
    }

    if (!receipt.isDeleted) {
      await t.rollback();
      return res.status(400).json({ message: "Phiếu thu này chưa bị xóa." });
    }
    
    // Kiểm tra xem khách hàng liên kết có bị xóa không
    if (receipt.KhachHang && receipt.KhachHang.isDeleted) {
      if (!restoreKhachHangToo) {
        await t.rollback();
        return res.status(409).json({
          error: "Khách hàng liên kết đã bị xóa",
          requireKhachHangRestore: true,
          khachHangInfo: {
            MaKhachHang: receipt.KhachHang.MaKhachHang,
            HoVaTen: receipt.KhachHang.HoVaTen
          },
          message: `Khách hàng "${receipt.KhachHang.HoVaTen}" liên kết với phiếu thu này đã bị xóa. Bạn có muốn khôi phục cả khách hàng không?`
        });
      }
      
      // Khôi phục khách hàng trước
      await KhachHang.update(
        { isDeleted: false },
        { where: { MaKhachHang: receipt.KhachHang.MaKhachHang }, transaction: t }
      );
    }

    const soTienThu = parseFloat(receipt.SoTienThu);

    // Khôi phục: Giảm nợ khách hàng (vì phiếu thu đã thu tiền)
    await KhachHang.increment("TongNo", {
      by: -soTienThu,
      where: { MaKhachHang: receipt.MaKhachHang },
      transaction: t,
    });

    // Khôi phục phiếu thu
    await PhieuThuTien.update(
      { isDeleted: false },
      { where: { MaPhieuThu }, transaction: t }
    );

    await t.commit();
    
    const successMessage = restoreKhachHangToo && receipt.KhachHang?.isDeleted
      ? `Đã khôi phục phiếu thu ${MaPhieuThu} và khách hàng "${receipt.KhachHang.HoVaTen}" thành công.`
      : `Đã khôi phục phiếu thu ${MaPhieuThu} thành công.`;
    
    res.json({ message: successMessage });
  } catch (error) {
    await t.rollback();
    console.error("Lỗi khi khôi phục phiếu thu:", error);
    res.status(500).json({ message: `Lỗi server: ${error.message}` });
  }
};

// =====================================================
// ADMIN ONLY: XÓA VĨNH VIỄN PHIẾU THU (HARD DELETE)
// =====================================================
const hardDeleteReceipt = async (req, res) => {
  const MaPhieuThu = req.params.MaPhieuThu;
  const t = await sequelize.transaction();

  try {
    const receipt = await PhieuThuTien.findByPk(MaPhieuThu, { transaction: t });
    if (!receipt) {
      await t.rollback();
      return res.status(404).json({ message: "Không tìm thấy phiếu thu." });
    }

    if (!receipt.isDeleted) {
      await t.rollback();
      return res.status(400).json({
        message: "Chỉ có thể xóa vĩnh viễn phiếu thu đã được xóa mềm trước đó.",
      });
    }

    // Xóa phiếu thu
    await receipt.destroy({ transaction: t });

    await t.commit();
    res.json({
      message: `Đã xóa vĩnh viễn phiếu thu ${MaPhieuThu} khỏi hệ thống.`,
    });
  } catch (error) {
    await t.rollback();
    console.error("Lỗi khi xóa vĩnh viễn phiếu thu:", error);
    res.status(500).json({ message: `Lỗi server: ${error.message}` });
  }
};

module.exports = {
  getCustomerInfo,
  getLastMaPhieuThu,
  createReceipt,
  updateReceipt,
  deleteReceipt,
  getDeletedReceipts,
  restoreReceipt,
  hardDeleteReceipt,
  getReceiptDetail,
};
