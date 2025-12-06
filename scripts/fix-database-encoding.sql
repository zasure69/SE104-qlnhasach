-- =====================================================
-- SCRIPT SỬA LỖI ENCODING DATABASE
-- Chạy trong MySQL Workbench hoặc phpMyAdmin
-- =====================================================

-- Bước 1: Chuyển database sang utf8mb4
ALTER DATABASE sql12805596 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Bước 2: Chuyển các bảng sang utf8mb4
ALTER TABLE DAUSACH CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE SACH CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE TACGIA CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE THELOAI CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE KHACHHANG CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE HOADON CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE PHIEUNHAPSACH CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE PHIEUTHUTIEN CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE THAMSO CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE CT_TACGIA CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE CT_HD CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE CT_PNS CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE BAOCAOCONGNO CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE BAOCAODOANHTHU CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE BAOCAOTON CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Bước 3: Xóa dữ liệu bị corrupt (giữ lại USER để không mất tài khoản)
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE CT_TACGIA;
TRUNCATE TABLE CT_HD;
TRUNCATE TABLE CT_PNS;
TRUNCATE TABLE PHIEUTHUTIEN;
TRUNCATE TABLE HOADON;
TRUNCATE TABLE PHIEUNHAPSACH;
TRUNCATE TABLE SACH;
TRUNCATE TABLE DAUSACH;
TRUNCATE TABLE TACGIA;
TRUNCATE TABLE THELOAI;
-- Giữ lại KhachHang nếu muốn, hoặc xóa:
-- TRUNCATE TABLE KhachHang;
SET FOREIGN_KEY_CHECKS = 1;

-- Bước 4: Nhập lại dữ liệu MẪU với encoding đúng
-- Thể loại
INSERT INTO THELOAI (MaTheLoai, TenTheLoai) VALUES
('TL001', 'Truyện ngắn'),
('TL002', 'Tiểu thuyết'),
('TL003', 'Kỹ năng sống');

-- Tác giả  
INSERT INTO TACGIA (MaTacGia, HoTen, NamSinh) VALUES
('TG001', 'Nguyễn Nhật Ánh', 1955),
('TG002', 'Fujiko F. Fujio', 1933),
('TG003', 'Tố Hữu', 1920);

-- Đầu sách - SỬA LẠI DỮ LIỆU ĐÚNG
INSERT INTO DAUSACH (MaDauSach, MaTheLoai, TenSach, MoTa) VALUES
('DS001', 'TL002', 'Doraemon', 'Truyện về chú mèo máy đến từ tương lai'),
('DS002', 'TL001', 'Dora the Explorer', NULL),
('DS003', 'TL001', 'Mắt Biếc', 'Tiểu thuyết về tình yêu tuổi học trò'),
('DS004', 'TL001', 'Doraemon Plus', NULL);

-- Liên kết tác giả
INSERT INTO CT_TACGIA (MaDauSach, MaTacGia) VALUES
('DS001', 'TG002'),  -- Doraemon - Fujiko
('DS002', 'TG002'),  -- Dora - Fujiko  
('DS003', 'TG001'),  -- Mắt Biếc - Nguyễn Nhật Ánh
('DS004', 'TG002');  -- Doraemon Plus - Fujiko

-- Kiểm tra kết quả
SELECT 
    ds.MaDauSach,
    ds.TenSach,
    ds.MoTa,
    tl.TenTheLoai,
    GROUP_CONCAT(tg.HoTen SEPARATOR ', ') AS TacGia
FROM DAUSACH ds
LEFT JOIN THELOAI tl ON ds.MaTheLoai = tl.MaTheLoai
LEFT JOIN CT_TACGIA ct ON ds.MaDauSach = ct.MaDauSach
LEFT JOIN TACGIA tg ON ct.MaTacGia = tg.MaTacGia
GROUP BY ds.MaDauSach
ORDER BY ds.MaDauSach;

SELECT 'Database đã được sửa encoding và nhập lại dữ liệu thành công!' AS Status;
