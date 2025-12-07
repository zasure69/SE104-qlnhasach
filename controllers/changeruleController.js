const db = require('../models');

// =============================================================
// SỬA: HÀM CẬP NHẬT 1 QUY ĐỊNH (API)
// =============================================================
const updateRule = async (req, res) => {
    // 1. Lấy TenThamSo từ URL (ví dụ: /api/admin/rules/SoTienNoToiDa)
    const tenThamSo = req.params.tenThamSo;
    
    // 2. Lấy GiaTri mới từ body (chỉ chứa { GiaTri: 5000 })
    const { GiaTri } = req.body;

    try {
        // 3. Tìm tham số bằng khóa chính
        const rule = await db.ThamSo.findByPk(tenThamSo);
        if (!rule) {
            return res.status(404).json({ error: 'Không tìm thấy quy định.' });
        }

        // 4. Cập nhật giá trị
        rule.GiaTri = GiaTri;
        await rule.save(); // Lưu thay đổi
        
        // 5. Trả về rule đã cập nhật
        res.status(200).json({ 
            message: 'Cập nhật quy định thành công!', 
            rule: rule // Gửi lại rule để JS cập nhật bảng
        });

    } catch (err) {
        console.error('Lỗi cập nhật quy định:', err);
        res.status(500).json({ error: 'Lỗi server, không thể cập nhật quy định.' });
    }
};

module.exports = {
    // Sửa: Đổi tên hàm export
    updateRule 
};