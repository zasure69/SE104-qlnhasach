// controllers/billController.js
const db = require('../models'); 
const { HoaDon, CT_HD, Sach, KhachHang, sequelize, DauSach, TheLoai, CT_PNS, ThamSo } = db;

// =============================================================
//  API: LẤY THÔNG TIN KHÁCH HÀNG (GET /api/bill/customer/:id)
// =============================================================
const getCustomerInfo = async (req, res) => {
    try {
        const customer = await KhachHang.findByPk(req.params.MaKH, {
            attributes: ['HoVaTen', 'TongNo']
        });
        if (!customer) {
            return res.status(404).json({ message: 'Không tìm thấy khách hàng.' });
        }
        res.json(customer);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi tìm khách hàng.' });
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
            attributes: ['DonGiaBan'], 
            order: [['MaPhieuNhap', 'DESC']], 
            raw: true 
        });
        
        const latestPrice = latestPriceRecord ? latestPriceRecord.DonGiaBan : 0;
        const book = await Sach.findOne({
            where: { MaSach: MaSach },
            attributes: ['MaSach', 'SoLuongTon'], 
            include: [{
                model: DauSach,
                attributes: ['TenSach'],
                required: true,
                include: [{
                    model: TheLoai,
                    as: 'TheLoai', 
                    attributes: ['TenTheLoai'],
                    required: false 
                }]
            }]
        });

        if (!book) {
            return res.status(404).json({ message: 'Không tìm thấy sách.' });
        }
        
        res.json({
            name: book.DauSach.TenSach, 
            cat: book.DauSach.TheLoai?.TenTheLoai || 'Chưa phân loại', 
            price: latestPrice, 
            stock: book.SoLuongTon 
        });
        
    } catch (error) {
        console.error("Lỗi server khi tìm sách:", error);
        res.status(500).json({ message: 'Lỗi server khi tìm sách.' });
    }
};

// =============================================================
//  API: TẠO HÓA ĐƠN MỚI (POST /api/bill/create)
// =============================================================
const create = async (req, res) => {
    if (!req.body) {
         return res.status(400).json({ message: 'Dữ liệu hóa đơn không được gửi lên (request body rỗng).' });
    }
    
    const { 
        MaHoaDon, 
        MaKhachHang, 
        TongTien, 
        SoTienTra, 
        ConLai, 
        Details 
    } = req.body;
    
    if (!MaHoaDon || !MaKhachHang || !Details || Details.length === 0) {
        return res.status(400).json({ message: 'Thiếu Mã hóa đơn, Mã khách hàng hoặc chi tiết sách.' });
    }

    const t = await sequelize.transaction();

    try {
        // Lấy quy định từ bảng THAMSO
        const minStockRule = await ThamSo.findOne({ where: { TenThamSo: 'SoLuongTonToiThieuSauKhiBan' }, transaction: t });
        const minStockAfterSale = minStockRule ? minStockRule.GiaTri : 0; // Default 0 nếu không có quy định

        const maxDebtRule = await ThamSo.findOne({ where: { TenThamSo: 'SoTienNoToiDa' }, transaction: t });
        const maxDebtAllowed = maxDebtRule ? maxDebtRule.GiaTri : Infinity; // Default Infinity nếu không có quy định

        const khachHang = await KhachHang.findByPk(MaKhachHang, { attributes: ['TongNo'], transaction: t });
        if (!khachHang) {
            await t.rollback();
            return res.status(404).json({ message: 'Không tìm thấy khách hàng.' });
        }
        
        const newTongNo = parseFloat(khachHang.TongNo) + parseFloat(ConLai); 
        
        // Quy định 2: Số tiền nợ tối đa
        if (newTongNo > maxDebtAllowed) {
            await t.rollback();
            return res.status(400).json({ message: `Khách hàng nợ vượt quá ${maxDebtAllowed}. Tổng nợ mới: ${newTongNo}` });
        }

        for (const detail of Details) {
            const sach = await Sach.findByPk(detail.MaSach, { attributes: ['SoLuongTon'], transaction: t });
            if (!sach) {
                await t.rollback();
                return res.status(404).json({ message: `Không tìm thấy sách ${detail.MaSach}.` });
            }

            if (sach.SoLuongTon < detail.SoLuongBan) {
                await t.rollback();
                return res.status(400).json({ message: `Sách ${detail.MaSach} không đủ tồn kho. Tồn hiện tại: ${sach.SoLuongTon}, yêu cầu: ${detail.SoLuongBan}` });
            }
            
            // Quy định 1: Tồn kho tối thiểu sau khi bán
            const projectedStock = sach.SoLuongTon - detail.SoLuongBan;
            if (projectedStock < minStockAfterSale) {
                await t.rollback();
                return res.status(400).json({ message: `Sách ${detail.MaSach} sẽ có tồn kho (${projectedStock}) thấp hơn quy định (${minStockAfterSale}) sau khi bán.` });
            }
        }

        await HoaDon.create({
            MaHoaDon: MaHoaDon,
            NgayLapHoaDon: new Date(),
            MaKhachHang: MaKhachHang,
            MaNhanVien: req.user ? req.user.id : 'NV001', // Lấy từ token nếu có
            TongTien: TongTien,
            SoTienTra: SoTienTra,
            ConLai: ConLai
        }, { transaction: t });

        const newDetails = Details.map(d => ({
            MaHoaDon: MaHoaDon,
            MaSach: d.MaSach,
            SoLuongBan: d.SoLuongBan,
            DonGiaBan: d.DonGiaBan,
            ThanhTien: d.ThanhTien
        }));
        
        await CT_HD.bulkCreate(newDetails, { transaction: t });

        for (const detail of Details) {
            await Sach.increment('SoLuongTon', { by: -detail.SoLuongBan, where: { MaSach: detail.MaSach }, transaction: t });
        }

        if (parseFloat(ConLai) > 0) {
            await KhachHang.increment('TongNo', { by: parseFloat(ConLai), where: { MaKhachHang: MaKhachHang }, transaction: t });
        }

        await t.commit();
        res.json({ message: `Hóa đơn ${MaHoaDon} đã được lập thành công.` });

    } catch (error) {
        await t.rollback();
        console.error("Lỗi khi lập hóa đơn:", error);
        res.status(500).json({ message: `Lỗi server khi lập hóa đơn: ${error.message}` });
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
            attributes: ['MaHoaDon', 'NgayLapHoaDon', 'MaKhachHang', 'TongTien', 'SoTienTra', 'ConLai'],
            include: [
                {
                    model: KhachHang,
                    // Chỉ lấy tên khách hàng
                    attributes: ['HoVaTen'], 
                },
                {
                    model: CT_HD,
                    as: 'CT_HDs', // PHẢI KHỚP với alias đã định nghĩa trong index.js
                    // Chỉ lấy các trường cần thiết của CT_HD
                    attributes: ['MaSach', 'SoLuongBan', 'DonGiaBan', 'ThanhTien'],
                    include: [
                        {
                            model: Sach,
                            // Chỉ lấy thông tin Sách cần thiết (ví dụ: MaSach, giá)
                            attributes: ['MaSach', 'SoLuongTon'], // Thêm các thuộc tính khác của Sach nếu cần
                            include: [
                                {
                                    model: DauSach,
                                    // CHỈ LẤY TRƯỜNG CỤ THỂ BẠN CẦN (TenDauSach)
                                    attributes: ['TenSach'], 
                                    required: true,
                                    include: [
                                        {
                                            model: TheLoai,
                                            attributes: ['TenTheLoai'],
                                            required: true
                                        }
                                    ]
                                }
                            ],
                            required: true // Bắt buộc phải có Sach
                        }
                    ],
                    required: true // Bắt buộc phải có CT_HD
                }
            ]
        });

        if (!HoaDonData) {
            return res.status(404).json({ message: 'Không tìm thấy hóa đơn.' });
        }
        
        // Trả về dữ liệu
        res.json({
            HoaDon: HoaDonData,
            Details: HoaDonData.Details 
        });

    } catch (error) {
        console.error("Lỗi truy vấn chi tiết hóa đơn:", error);
        res.status(500).json({ 
            message: "Lỗi Server khi lấy chi tiết hóa đơn.",
            error: error.message // Trả về thông báo lỗi chi tiết để debug
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
        // Lấy dữ liệu và quy định
        const oldBill = await HoaDon.findByPk(MaHD, { transaction: t });
        if (!oldBill) { 
            await t.rollback(); 
            return res.status(404).json({ message: 'Không tìm thấy hóa đơn cần cập nhật.' }); 
        }

        const oldDetails = await CT_HD.findAll({ where: { MaHoaDon: MaHD }, transaction: t });
        const minStockRule = await ThamSo.findOne({ where: { TenThamSo: 'SoLuongTonToiThieuSauKhiBan' }, transaction: t });
        const minStockAfterSale = minStockRule ? minStockRule.GiaTri : 0;
        const maxDebtRule = await ThamSo.findOne({ where: { TenThamSo: 'SoTienNoToiDa' }, transaction: t });
        const maxDebtAllowed = maxDebtRule ? maxDebtRule.GiaTri : Infinity;
        const khachHang = await KhachHang.findByPk(MaKhachHang, { attributes: ['TongNo'], transaction: t });
        if (!khachHang) {
            await t.rollback();
            return res.status(404).json({ message: 'Không tìm thấy khách hàng.' });
        }

        // --- BƯỚC 1: KIỂM TRA LOGIC TRƯỚC KHI THAY ĐỔI ---
        const tempStockAdjustments = {}; 
        for (const oldDetail of oldDetails) {
            tempStockAdjustments[oldDetail.MaSach] = (tempStockAdjustments[oldDetail.MaSach] || 0) + oldDetail.SoLuongBan;
        }

        for (const newDetail of Details) {
            const sach = await Sach.findByPk(newDetail.MaSach, { attributes: ['SoLuongTon'], transaction: t });
            if (!sach) {
                await t.rollback();
                return res.status(404).json({ message: `Không tìm thấy sách ${newDetail.MaSach}.` });
            }

            const currentStock = sach.SoLuongTon || 0;
            const stockAfterOldRevert = currentStock + (tempStockAdjustments[newDetail.MaSach] || 0);
            const projectedStock = stockAfterOldRevert - newDetail.SoLuongBan;
            
            if (projectedStock < 0) {
                await t.rollback();
                return res.status(400).json({ message: `Sách ${newDetail.MaSach} không đủ tồn kho sau khi cập nhật hóa đơn. Tồn dự kiến: ${projectedStock}.` });
            }
            if (projectedStock < minStockAfterSale) {
                await t.rollback();
                return res.status(400).json({ message: `Sách ${newDetail.MaSach} sẽ có tồn kho (${projectedStock}) thấp hơn quy định (${minStockAfterSale}) sau khi cập nhật.` });
            }
        }

        const oldCustomerDebtWithoutOldBill = parseFloat(khachHang.TongNo) - parseFloat(oldBill.ConLai);
        const newProjectedTotalDebt = oldCustomerDebtWithoutOldBill + parseFloat(ConLai);
        if (newProjectedTotalDebt > maxDebtAllowed) {
            await t.rollback();
            return res.status(400).json({ message: `Khách hàng nợ vượt quá ${maxDebtAllowed}. Tổng nợ mới dự kiến: ${newProjectedTotalDebt}.` });
        }

        // --- BƯỚC 2: THỰC HIỆN THAY ĐỔI KHI ĐÃ HỢP LỆ ---
        for (const oldDetail of oldDetails) {
            await Sach.increment('SoLuongTon', { by: oldDetail.SoLuongBan, where: { MaSach: oldDetail.MaSach }, transaction: t });
        }
        const oldConLai = parseFloat(oldBill.ConLai);
        if (oldConLai > 0) {
            await KhachHang.increment('TongNo', { by: -oldConLai, where: { MaKhachHang: oldBill.MaKhachHang }, transaction: t });
        }
        await CT_HD.destroy({ where: { MaHoaDon: MaHD }, transaction: t });

        await HoaDon.update(
            { MaKhachHang, TongTien, SoTienTra, ConLai }, 
            { where: { MaHoaDon: MaHD }, transaction: t }
        );

        const newDetails = Details.map(d => ({
            MaHoaDon: MaHD, MaSach: d.MaSach, SoLuongBan: d.SoLuongBan,
            DonGiaBan: d.DonGiaBan, ThanhTien: d.ThanhTien
        }));
        await CT_HD.bulkCreate(newDetails, { transaction: t });

        for (const detail of newDetails) {
            await Sach.increment('SoLuongTon', { by: -detail.SoLuongBan, where: { MaSach: detail.MaSach }, transaction: t });
        }

        const newConLai = parseFloat(ConLai);
        if (newConLai > 0) {
            await KhachHang.increment('TongNo', { by: newConLai, where: { MaKhachHang: MaKhachHang }, transaction: t });
        }

        await t.commit();
        res.json({ message: `Hóa đơn ${MaHD} đã được cập nhật thành công.` });

    } catch (error) {
        await t.rollback();
        console.error("Lỗi cập nhật hóa đơn:", error);
        res.status(500).json({ message: 'Lỗi server khi cập nhật hóa đơn. Vui lòng kiểm tra dữ liệu đầu vào và tồn kho.', error: error.message });
    }
};

// =============================================================
//  API: XÓA HÓA ĐƠN (DELETE /api/bill/:id)
// =============================================================
const deleteBill = async (req, res) => {
    const MaHD = req.params.MaHD;
    const t = await sequelize.transaction(); // Bắt đầu Transaction

    try {
        // 1. Tìm Hóa đơn và Chi tiết cũ
        const bill = await HoaDon.findByPk(MaHD, { transaction: t });
        if (!bill) {
            await t.rollback();
            return res.status(404).json({ message: 'Không tìm thấy hóa đơn.' });
        }

        const details = await CT_HD.findAll({ where: { MaHoaDon: MaHD }, transaction: t });

        // 2. HOÀN TÁC TỒN KHO (Cộng lại số lượng sách đã bán vào kho)
        for (const item of details) {
            await Sach.increment('SoLuongTon', { 
                by: item.SoLuongBan, 
                where: { MaSach: item.MaSach }, 
                transaction: t 
            });
        }

        // 3. HOÀN TÁC NỢ KHÁCH HÀNG (Nếu hóa đơn này có ghi nợ, phải trừ nợ đi)
        // Logic: Khi xóa hóa đơn, coi như giao dịch chưa từng xảy ra -> Trả lại trạng thái nợ cũ
        const conLai = parseFloat(bill.ConLai);
        if (conLai > 0) {
            await KhachHang.increment('TongNo', { 
                by: -conLai, // Giảm nợ
                where: { MaKhachHang: bill.MaKhachHang }, 
                transaction: t 
            });
        }

        // 4. Xóa Chi tiết và Hóa đơn
        await CT_HD.destroy({ where: { MaHoaDon: MaHD }, transaction: t });
        await HoaDon.destroy({ where: { MaHoaDon: MaHD }, transaction: t });

        await t.commit();
        res.json({ message: `Đã xóa hóa đơn ${MaHD} và hoàn tác tồn kho/nợ thành công.` });

    } catch (error) {
        await t.rollback();
        console.error("Lỗi khi xóa hóa đơn:", error);
        res.status(500).json({ message: `Lỗi server: ${error.message}` });
    }
};

const getLastMaHD = async (req, res) => {
    try {
        const lastBill = await HoaDon.findOne({
            attributes: ['MaHoaDon'],
            // Sắp xếp giảm dần theo MaHoaDon (vì MaHD là chuỗi 'HD001', 'HD002',...)
            order: [['MaHoaDon', 'DESC']], 
            limit: 1,
            raw: true
        });

        // Trả về MaHoaDon lớn nhất hoặc null nếu chưa có hóa đơn nào
        res.json({ lastMaHD: lastBill ? lastBill.MaHoaDon : null });
    } catch (error) {
        console.error("Lỗi server khi lấy Mã Hóa Đơn cuối cùng:", error);
        res.status(500).json({ message: 'Lỗi server khi lấy Mã Hóa Đơn cuối cùng.' });
    }
};

module.exports = {
    getCustomerInfo,
    getBookInfo,
    create,
    getDetail,
    updateBill,
    deleteBill,
    getLastMaHD
};