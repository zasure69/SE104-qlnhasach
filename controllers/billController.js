// controllers/billController.js
const db = require('../models'); 
const { HoaDon, CT_HD, Sach, KhachHang, sequelize, DauSach, TheLoai, CT_PNS } = db;

// --- HÀM TIỆN ÍCH (Giả định) ---
const checkQuyDinh = (SoTienNo) => {
    // Giả định: Kiểm tra quy định Tối đa nợ là 20.000 (Ví dụ)
    // Nếu nợ > 20000, trả về false, nếu không trả về true
    return SoTienNo <= 20000; 
};

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
    // Router dùng :MaHD, chúng ta coi đó là MaSach
    const MaSach = req.params.MaSach; 

    try {
        const latestPriceRecord = await CT_PNS.findOne({
            where: { MaSach: MaSach },
            attributes: ['DonGiaBan'], 
            order: [['MaPhieuNhap', 'DESC']], // Lấy bản ghi có MaPhieuNhap lớn nhất
            raw: true // Lấy kết quả thô để dễ đọc
        });
        
        // Lấy giá trị DonGiaBan. Nếu không có phiếu nhập nào, giá mặc định là 0.
        const latestPrice = latestPriceRecord ? latestPriceRecord.DonGiaBan : 0;
        const book = await Sach.findOne({
            where: { MaSach: MaSach },
            // Chú ý: DonGiaBan cần tồn tại trong Model Sach.js
            attributes: ['MaSach', 'SoLuongTon'], 
            include: [{
                model: DauSach,
                attributes: ['TenSach'],
                required: true, // Sách phải có Đầu sách
                include: [{
                    model: TheLoai,
                    as: 'TheLoai', // Phải dùng alias đã fix trước đó
                    attributes: ['TenTheLoai'],
                    required: false // LEFT JOIN: chấp nhận MaTheLoai có thể NULL
                }]
            }]
        });

        if (!book) {
            return res.status(404).json({ message: 'Không tìm thấy sách.' });
        }
        
        // Trả về dữ liệu theo cấu trúc mà Frontend mong đợi (name, cat, price)
        res.json({
            // book.DauSach.TenSach
            name: book.DauSach.TenSach, 
            // book.DauSach.TheLoai.TenTheLoai (sử dụng Optional Chaining)
            cat: book.DauSach.TheLoai?.TenTheLoai || 'Chưa phân loại', 
            // book.DonGiaBan (lấy từ bảng SACH)
            price: latestPrice, 
            stock: book.SoLuongTon // Thêm số lượng tồn để dễ validation
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
    // --- FIX LỖI 1: Đảm bảo req.body không undefined và Destructuring an toàn ---
    if (!req.body) {
         return res.status(400).json({ message: 'Dữ liệu hóa đơn không được gửi lên (request body rỗng).' });
    }
    
    // Sử dụng cú pháp gán giá trị mặc định {} nếu req.body không có gì
    const { 
        MaHoaDon, 
        MaKhachHang, 
        TongTien, 
        SoTienTra, 
        ConLai, 
        Details // Mảng chi tiết
    } = req.body;
    
    // Kiểm tra tính hợp lệ cơ bản
    if (!MaHoaDon || !MaKhachHang || !Details || Details.length === 0) {
        return res.status(400).json({ message: 'Thiếu Mã hóa đơn, Mã khách hàng hoặc chi tiết sách.' });
    }

    const t = await sequelize.transaction();

    try {
        // *** 1. KIỂM TRA QUY ĐỊNH NỢ VÀ TỒN KHO ***
        const khachHang = await KhachHang.findByPk(MaKhachHang, { attributes: ['TongNo'], transaction: t });
        if (!khachHang) {
            await t.rollback();
            return res.status(404).json({ message: 'Không tìm thấy khách hàng.' });
        }
        
        // Tính tổng nợ mới
        const newTongNo = parseFloat(khachHang.TongNo) + parseFloat(ConLai); 
        
        // Giả sử bạn có hàm kiểm tra quy định nợ (checkQuyDinh)
        // if (!checkQuyDinh(newTongNo)) {
        //     await t.rollback();
        //     return res.status(400).json({ message: 'Vi phạm quy định nợ tối đa.' });
        // }

        // Kiểm tra tồn kho cho từng chi tiết
        for (const detail of Details) {
            const sach = await Sach.findByPk(detail.MaSach, { attributes: ['SoLuongTon'], transaction: t });
            if (!sach || sach.SoLuongTon < detail.SoLuongBan) {
                await t.rollback();
                return res.status(400).json({ message: `Sách ${detail.MaSach} không đủ tồn kho.` });
            }
        }

        // *** 2. TẠO HÓA ĐƠN CHÍNH (HOADON) ***
        await HoaDon.create({
            MaHoaDon: MaHoaDon,
            NgayLapHoaDon: new Date(),
            MaKhachHang: MaKhachHang,
            MaNhanVien: 'NV001', 
            TongTien: TongTien,
            SoTienTra: SoTienTra,
            ConLai: ConLai
        }, { transaction: t });

        // *** 3. TẠO CHI TIẾT HÓA ĐƠN (CT_HD) và TRỪ TỒN KHO ***
        const newDetails = Details.map(d => ({
            MaHoaDon: MaHoaDon,
            MaSach: d.MaSach,
            SoLuongBan: d.SoLuongBan,
            DonGiaBan: d.DonGiaBan,
            ThanhTien: d.ThanhTien
        }));
        
        await CT_HD.bulkCreate(newDetails, { transaction: t });

        // Trừ tồn kho
        for (const detail of Details) {
            await Sach.increment('SoLuongTon', { by: -detail.SoLuongBan, where: { MaSach: detail.MaSach }, transaction: t });
        }

        // *** 4. CẬP NHẬT NỢ KHÁCH HÀNG ***
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
                    as: 'Details', // PHẢI KHỚP với alias đã định nghĩa trong index.js
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
    // Sửa lỗi: Lấy tham số theo tên trong Router là MaHD
    const MaHD = req.params.MaHD; 
    const { MaKhachHang, TongTien, SoTienTra, ConLai, Details } = req.body;

    const t = await sequelize.transaction();

    try {
        // --- BƯỚC 0: TÌM HÓA ĐƠN VÀ CT_HD CŨ ---
        const oldBill = await HoaDon.findByPk(MaHD, { transaction: t });
        if (!oldBill) { 
            await t.rollback(); 
            return res.status(404).json({ message: 'Không tìm thấy hóa đơn cần cập nhật.' }); 
        }

        const oldDetails = await CT_HD.findAll({ where: { MaHoaDon: MaHD }, transaction: t });

        // --- BƯỚC 1: HOÀN TÁC (ROLLBACK) CÁC THAY ĐỔI CŨ ---
        
        // 1.1. Hoàn tác Tồn kho Sách cũ
        for (const detail of oldDetails) {
            // Tăng số lượng tồn kho lại (Hoàn lại lượng đã bán trước đó)
            await Sach.increment('SoLuongTon', { by: detail.SoLuongBan, where: { MaSach: detail.MaSach }, transaction: t });
        }

        // 1.2. Hoàn tác Nợ Khách hàng cũ
        const oldConLai = parseFloat(oldBill.ConLai);
        if (oldConLai > 0) {
            // Giảm tổng nợ của khách hàng (hoàn tác nợ cũ)
            await KhachHang.increment('TongNo', { by: -oldConLai, where: { MaKhachHang: oldBill.MaKhachHang }, transaction: t });
        }
        
        // 1.3. Xóa tất cả CT_HD cũ (Để tạo lại mới hoàn toàn)
        await CT_HD.destroy({ where: { MaHoaDon: MaHD }, transaction: t });

        // --- BƯỚC 2: CẬP NHẬT HOADON CHÍNH ---
        await HoaDon.update(
            { 
                MaKhachHang: MaKhachHang, 
                TongTien: TongTien,
                SoTienTra: SoTienTra,
                ConLai: ConLai,
                // Không cập nhật NgayLapHoaDon (Ngày lập nên giữ nguyên)
            }, 
            { where: { MaHoaDon: MaHD }, transaction: t }
        );

        // --- BƯỚC 3: ÁP DỤNG THAY ĐỔI MỚI ---

        // 3.1. Tạo mới Chi tiết Hóa Đơn (CT_HD) và Giảm Tồn kho
        const newDetails = Details.map(d => ({
            MaHoaDon: MaHD,
            MaSach: d.MaSach,
            SoLuongBan: d.SoLuongBan,
            DonGiaBan: d.DonGiaBan,
            ThanhTien: d.ThanhTien
        }));

        await CT_HD.bulkCreate(newDetails, { transaction: t });

        // Giảm tồn kho theo chi tiết mới
        for (const detail of newDetails) {
            await Sach.increment('SoLuongTon', { by: -detail.SoLuongBan, where: { MaSach: detail.MaSach }, transaction: t });
        }

        // 3.2. Áp dụng Nợ Khách hàng mới
        const newConLai = parseFloat(ConLai);
        if (newConLai > 0) {
            // Tăng tổng nợ của khách hàng (áp dụng nợ mới)
            await KhachHang.increment('TongNo', { by: newConLai, where: { MaKhachHang: MaKhachHang }, transaction: t });
        }

        // --- BƯỚC 4: HOÀN THÀNH TRANSACTION ---
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
    const { id } = req.params;
    const t = await sequelize.transaction();

    try {
        const billToDelete = await HoaDon.findByPk(id, { transaction: t });
        if (!billToDelete) { await t.rollback(); return res.status(404).json({ message: 'Không tìm thấy hóa đơn.' }); }
        
        const detailsToDelete = await CT_HD.findAll({ where: { MaHoaDon: id }, transaction: t });

        // 1. HOÀN TÁC TỒN KHO
        for (const detail of detailsToDelete) {
            await Sach.increment('SoLuongTon', { by: detail.SoLuongBan, where: { MaSach: detail.MaSach }, transaction: t });
        }

        // 2. HOÀN TÁC NỢ
        const conLai = parseFloat(billToDelete.ConLai);
        if (conLai > 0) {
            await KhachHang.increment('TongNo', { by: -conLai, where: { MaKhachHang: billToDelete.MaKhachHang }, transaction: t });
        }

        // 3. XÓA DỮ LIỆU
        await CT_HD.destroy({ where: { MaHoaDon: id }, transaction: t });
        await HoaDon.destroy({ where: { MaHoaDon: id }, transaction: t });

        await t.commit();
        res.json({ message: `Hóa đơn ${id} đã được xóa thành công.` });

    } catch (error) {
        await t.rollback();
        console.error('Lỗi khi xóa hóa đơn:', error);
        res.status(500).json({ message: 'Lỗi server khi xóa hóa đơn.', error: error.message });
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