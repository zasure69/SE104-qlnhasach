-- Script thêm cột isDeleted vào các bảng để hỗ trợ Soft Delete
-- Chạy script này để cập nhật database

-- Thêm cột isDeleted vào bảng NHANVIEN
ALTER TABLE NHANVIEN ADD COLUMN IF NOT EXISTS isDeleted BOOLEAN DEFAULT FALSE NOT NULL;

-- Thêm cột isDeleted vào bảng KHACHHANG
ALTER TABLE KHACHHANG ADD COLUMN IF NOT EXISTS isDeleted BOOLEAN DEFAULT FALSE NOT NULL;

-- Thêm cột isDeleted vào bảng SACH
ALTER TABLE SACH ADD COLUMN IF NOT EXISTS isDeleted BOOLEAN DEFAULT FALSE NOT NULL;

-- Thêm cột isDeleted vào bảng DAUSACH
ALTER TABLE DAUSACH ADD COLUMN IF NOT EXISTS isDeleted BOOLEAN DEFAULT FALSE NOT NULL;

-- Thêm cột isDeleted vào bảng THELOAI
ALTER TABLE THELOAI ADD COLUMN IF NOT EXISTS isDeleted BOOLEAN DEFAULT FALSE NOT NULL;

-- Thêm cột isDeleted vào bảng TACGIA
ALTER TABLE TACGIA ADD COLUMN IF NOT EXISTS isDeleted BOOLEAN DEFAULT FALSE NOT NULL;

-- Tạo index để tăng hiệu suất query khi lọc theo isDeleted
CREATE INDEX IF NOT EXISTS idx_nhanvien_isdeleted ON NHANVIEN(isDeleted);
CREATE INDEX IF NOT EXISTS idx_khachhang_isdeleted ON KHACHHANG(isDeleted);
CREATE INDEX IF NOT EXISTS idx_sach_isdeleted ON SACH(isDeleted);
CREATE INDEX IF NOT EXISTS idx_dausach_isdeleted ON DAUSACH(isDeleted);
CREATE INDEX IF NOT EXISTS idx_theloai_isdeleted ON THELOAI(isDeleted);
CREATE INDEX IF NOT EXISTS idx_tacgia_isdeleted ON TACGIA(isDeleted);
