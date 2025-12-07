-- Script sửa encoding cho database
-- Chạy trong MySQL Workbench hoặc phpMyAdmin

-- 1. Kiểm tra charset hiện tại của database
SELECT SCHEMA_NAME, DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME
FROM INFORMATION_SCHEMA.SCHEMATA 
WHERE SCHEMA_NAME = 'se104_qlnhasach';

-- 2. Chuyển database sang utf8mb4
ALTER DATABASE se104_qlnhasach CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 3. Chuyển các bảng sang utf8mb4
ALTER TABLE dausach CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE sach CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE tacgia CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE theloai CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE khachhang CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE hoadon CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE phieunhapsach CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE phieuthutien CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE thamso CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 4. Kiểm tra lại sau khi convert
SELECT TenSach, MoTa FROM dausach LIMIT 5;
SELECT HoTen FROM tacgia LIMIT 5;
SELECT TenTheLoai FROM theloai;

-- Lưu ý: Nếu dữ liệu vẫn hiển thị sai sau khi chạy ALTER TABLE,
-- nghĩa là dữ liệu đã bị corrupt khi insert. Cần DELETE và INSERT lại với encoding đúng.
