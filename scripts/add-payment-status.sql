-- Script thêm cột trạng thái thanh toán vào bảng HOADON
-- Chạy script này sau khi đã backup database

-- 1. Thêm cột TrangThaiThanhToan
-- Các giá trị: 'HOAN_TAT', 'GHI_NO', 'DA_HUY', 'DA_SUA'
ALTER TABLE HOADON 
ADD TrangThaiThanhToan NVARCHAR(20) DEFAULT 'HOAN_TAT' NOT NULL;

-- 2. Thêm cột GhiChu để lưu lý do thay đổi
ALTER TABLE HOADON 
ADD GhiChu NVARCHAR(500) NULL;

-- 3. Thêm cột NgayCapNhat để theo dõi lần sửa cuối
ALTER TABLE HOADON 
ADD NgayCapNhat DATETIME NULL;

-- 4. Cập nhật trạng thái cho các hóa đơn hiện có dựa trên cột ConLai
UPDATE HOADON 
SET TrangThaiThanhToan = CASE 
    WHEN ConLai > 0 THEN 'GHI_NO' 
    ELSE 'HOAN_TAT' 
END
WHERE TrangThaiThanhToan IS NULL OR TrangThaiThanhToan = '';

-- 5. Tạo index để tối ưu truy vấn theo trạng thái
CREATE INDEX IX_HOADON_TrangThai ON HOADON(TrangThaiThanhToan);

-- Kiểm tra kết quả
SELECT MaHoaDon, TongTien, SoTienTra, ConLai, TrangThaiThanhToan, GhiChu 
FROM HOADON 
ORDER BY NgayLapHoaDon DESC;
