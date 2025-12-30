-- =============================================
-- Script: Tạo bảng Chi Tiết Lý Do Kiểm Kê
-- Mục đích: Hỗ trợ nhiều lý do cho 1 sách (VD: 2 cuốn bị trộm, 1 cuốn rách)
-- TRƯỜNG HỢP: Đã có bảng LOAILYDO_KIEMKE, cần tạo thêm CT_LYDO_KIEMKE
-- CHẠY TRONG PHPMYADMIN
-- =============================================

-- ===== BƯỚC 1: KIỂM TRA VÀ THÊM DỮ LIỆU MẪU (NẾU THIẾU) =====
-- Dùng INSERT IGNORE để bỏ qua nếu đã tồn tại
INSERT IGNORE INTO `LOAILYDO_KIEMKE` (`TenLyDo`, `MoTa`) VALUES
('Sách bị mất/trộm', 'Sách bị mất cắp hoặc thất lạc'),
('Sách bị hư hỏng', 'Sách rách, ướt, hỏng không thể bán'),
('Sách bị rách', 'Sách bị rách do vận chuyển hoặc lưu kho'),
('Sách bị ẩm mốc', 'Sách bị ẩm, mốc do bảo quản không tốt'),
('Sách bị ướt', 'Sách bị ướt do mưa, ngập hoặc sự cố'),
('Nhập sai số lượng', 'Số lượng nhập kho ban đầu bị sai'),
('Bán chưa ghi nhận', 'Đã bán nhưng chưa lập hóa đơn'),
('Sách trả lại', 'Khách hàng trả lại sách'),
('Không xác định', 'Chênh lệch không rõ nguyên nhân');

-- ===== BƯỚC 2: TẠO BẢNG CT_LYDO_KIEMKE (CHI TIẾT LÝ DO) =====
-- Bảng này cho phép 1 sách có nhiều lý do với số lượng khác nhau
CREATE TABLE IF NOT EXISTS `CT_LYDO_KIEMKE` (
  `Id` INT AUTO_INCREMENT PRIMARY KEY,
  `MaPhieuKiem` VARCHAR(20) NOT NULL,
  `MaSach` VARCHAR(15) NOT NULL,
  `MaLyDo` INT DEFAULT NULL,
  `LyDoKhac` VARCHAR(255) DEFAULT NULL COMMENT 'Lý do khác nếu không có trong danh sách',
  `SoLuong` INT NOT NULL DEFAULT 0 COMMENT 'Số lượng lệch do lý do này',
  INDEX `idx_phieu_sach` (`MaPhieuKiem`, `MaSach`),
  FOREIGN KEY (`MaPhieuKiem`, `MaSach`) REFERENCES `CT_KIEMKE`(`MaPhieuKiem`, `MaSach`) ON DELETE CASCADE,
  FOREIGN KEY (`MaLyDo`) REFERENCES `LOAILYDO_KIEMKE`(`MaLyDo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== BƯỚC 3: KIỂM TRA KẾT QUẢ =====
SELECT * FROM `LOAILYDO_KIEMKE`;
DESCRIBE `CT_LYDO_KIEMKE`;

-- =============================================
-- VÍ DỤ SỬ DỤNG:
-- Sách S001 tồn hệ thống 100, thực tế 94 (lệch 6 cuốn)
-- Chi tiết lý do:
--   - Bị trộm: 2 cuốn
--   - Bị rách: 1 cuốn  
--   - Bị ướt: 3 cuốn
-- 
-- INSERT INTO CT_KIEMKE VALUES ('PK001', 'S001', 100, 94);
-- INSERT INTO CT_LYDO_KIEMKE (MaPhieuKiem, MaSach, MaLyDo, SoLuong) VALUES 
--   ('PK001', 'S001', 1, 2),  -- Bị trộm: 2
--   ('PK001', 'S001', 3, 1),  -- Bị rách: 1
--   ('PK001', 'S001', 5, 3);  -- Bị ướt: 3
-- =============================================
