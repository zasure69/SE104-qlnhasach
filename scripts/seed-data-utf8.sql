-- Script xóa và nhập lại dữ liệu mẫu với UTF-8 encoding
-- Chạy sau khi đã ALTER TABLE sang utf8mb4

-- Xóa dữ liệu cũ (thứ tự quan trọng vì có foreign key)
DELETE FROM ct_tacgia;
DELETE FROM ct_hd;
DELETE FROM ct_pns;
DELETE FROM phieuthutien;
DELETE FROM hoadon;
DELETE FROM phieunhapsach;
DELETE FROM sach;
DELETE FROM dausach;
DELETE FROM tacgia;
DELETE FROM theloai;
DELETE FROM khachhang;

-- Nhập lại dữ liệu mẫu

-- Thể loại
INSERT INTO theloai (MaTheLoai, TenTheLoai) VALUES
('TL001', 'Văn học'),
('TL002', 'Khoa học'),
('TL003', 'Lịch sử'),
('TL004', 'Thiếu nhi'),
('TL005', 'Kinh tế');

-- Tác giả
INSERT INTO tacgia (MaTacGia, HoTen, NamSinh) VALUES
('TG001', 'Nguyễn Nhật Ánh', 1955),
('TG002', 'Tô Hoài', 1920),
('TG003', 'Nam Cao', 1915),
('TG004', 'Ngô Tất Tố', 1894),
('TG005', 'Vũ Trọng Phụng', 1912);

-- Đầu sách
INSERT INTO dausach (MaDauSach, TenSach, MaTheLoai, MoTa) VALUES
('DS001', 'Mắt Biếc', 'TL001', 'Tiểu thuyết về tình yêu tuổi học trò'),
('DS002', 'Dế Mèn Phiêu Lưu Ký', 'TL004', 'Truyện thiếu nhi kinh điển Việt Nam'),
('DS003', 'Chí Phèo', 'TL001', 'Truyện ngắn nổi tiếng của Nam Cao'),
('DS004', 'Tắt Đèn', 'TL001', 'Tiểu thuyết hiện thực phê phán'),
('DS005', 'Số Đỏ', 'TL001', 'Tiểu thuyết châm biếm xã hội');

-- Liên kết đầu sách - tác giả
INSERT INTO ct_tacgia (MaDauSach, MaTacGia) VALUES
('DS001', 'TG001'),
('DS002', 'TG002'),
('DS003', 'TG003'),
('DS004', 'TG004'),
('DS005', 'TG005');

-- Sách (bản cụ thể)
INSERT INTO sach (MaSach, MaDauSach, NhaXB, NamXB, SoLuongTon, MoTa) VALUES
('S001', 'DS001', 'NXB Trẻ', 2020, 50, 'Ấn bản mới nhất'),
('S002', 'DS002', 'NXB Kim Đồng', 2019, 30, 'Bìa cứng có tranh minh họa'),
('S003', 'DS003', 'NXB Văn học', 2021, 25, 'Tái bản lần thứ 10'),
('S004', 'DS004', 'NXB Văn học', 2018, 20, 'Phiên bản bìa mềm'),
('S005', 'DS005', 'NXB Hội Nhà Văn', 2022, 15, 'Xuất bản kỷ niệm 100 năm');

-- Khách hàng
INSERT INTO khachhang (MaKH, HoTen, SoDienThoai, Email, DiaChi, TongNo) VALUES
('KH001', 'Trần Văn An', '0901234567', 'an@example.com', 'Hà Nội', 0),
('KH002', 'Nguyễn Thị Bình', '0912345678', 'binh@example.com', 'TP.HCM', 0),
('KH003', 'Lê Văn Cường', '0923456789', 'cuong@example.com', 'Đà Nẵng', 0);

SELECT 'Dữ liệu mẫu đã được nhập thành công!' AS Status;
