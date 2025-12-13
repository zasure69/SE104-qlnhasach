# API Endpoints cho Quản lý Sách

## Cấu trúc Code đã được cải thiện dựa theo pattern của Customer

### 📚 **SÁCH (Sach)** - `/api/books`

#### 1. **Lấy danh sách tất cả sách**

```
GET /api/books/getSach
```

**Response 200:**

```json
[
  {
    "MaSach": "S001",
    "MaDauSach": "DS001",
    "NhaXB": "NXB Kim Đồng",
    "NamXB": 2020,
    "SoLuongTon": 50
  },
  ...
]
```

---

#### 2. **Thêm sách mới**

```
POST /api/books/createSach
```

**Request Body:**

```json
{
  "MaDauSach": "DS001", // Required - Mã đầu sách (phải tồn tại)
  "NhaXB": "NXB Kim Đồng", // Optional
  "NamXB": 2020, // Optional
  "SoLuongTon": 50 // Optional - Default: 0
}
```

**Response 201:**

```json
{
  "message": "Tạo sách thành công!",
  "sach": {
    "MaSach": "S002",
    "MaDauSach": "DS001",
    "NhaXB": "NXB Kim Đồng",
    "NamXB": 2020,
    "SoLuongTon": 50
  }
}
```

**Errors:**

- 400: Vui lòng chọn Đầu sách
- 404: Đầu sách không tồn tại
- 500: Lỗi server nội bộ

---

#### 3. **Sửa thông tin sách**

```
PATCH /api/books/updateSach/:maSach
```

**Request Body:** (Tất cả các trường đều optional)

```json
{
  "NhaXB": "NXB Trẻ",
  "NamXB": 2021,
  "SoLuongTon": 75
}
```

**Response 200:**

```json
{
  "message": "Cập nhật sách thành công!",
  "sach": {
    "MaSach": "S002",
    "MaDauSach": "DS001",
    "NhaXB": "NXB Trẻ",
    "NamXB": 2021,
    "SoLuongTon": 75
  }
}
```

**Errors:**

- 404: Không tìm thấy sách
- 500: Lỗi server nội bộ

---

#### 4. **Xóa sách**

```
DELETE /api/books/deleteSach/:maSach
```

**Response 200:**

```json
{
  "message": "Xóa sách thành công!"
}
```

**Errors:**

- 404: Không tìm thấy sách
- 400: Xóa thất bại! Sách này đã có trong hóa đơn hoặc phiếu nhập
- 500: Lỗi server nội bộ

---

## 🔍 So sánh với Customer API Pattern

### Customer Routes (`/api/customers`)

```javascript
GET    /api/customers/getCustomers
POST   /api/customers/createCustomers
PATCH  /api/customers/updateCustomers/:maKH
DELETE /api/customers/deleteCustomers/:maKH
```

### Sách Routes (`/api/books`) - **ĐÃ CẬP NHẬT**

```javascript
GET    /api/books/getSach
POST   /api/books/createSach
PATCH  /api/books/updateSach/:maSach
DELETE /api/books/deleteSach/:maSach
```

---

## 📝 Cấu trúc Controller đã được cải thiện

### File: `controllers/bookController.js`

#### ✅ Cải thiện đã thực hiện:

1. **Code gọn gàng, dễ đọc hơn** - Tách biệt rõ ràng các phần logic
2. **Comments đầy đủ** - Mô tả rõ từng bước xử lý
3. **Error handling thống nhất** - Xử lý lỗi giống như customerController
4. **Validate đầu vào** - Kiểm tra dữ liệu đầu vào đầy đủ
5. **Response format nhất quán** - Định dạng response giống nhau

#### Ví dụ cấu trúc hàm CREATE:

```javascript
// =============================================================
// HÀM THÊM SÁCH (CREATE)
// =============================================================
const createSach = async (req, res) => {
  const { MaDauSach, NhaXB, NamXB, SoLuongTon } = req.body;

  try {
    // 1. Validate đầu vào
    if (!MaDauSach) {
      return res.status(400).json({ error: 'Vui lòng chọn Đầu sách' });
    }

    // 2. Kiểm tra ràng buộc
    const dauSach = await db.DauSach.findByPk(MaDauSach);
    if (!dauSach) {
      return res.status(404).json({ error: 'Đầu sách không tồn tại' });
    }

    // 3. Tạo mã tự động
    const newMaSach = await generateNewSachId();

    // 4. Chuẩn hóa dữ liệu
    // ... (xử lý NamXB, SoLuongTon)

    // 5. Tạo bản ghi mới
    const newSach = await db.Sach.create({...});

    // 6. Trả về kết quả
    res.status(201).json({ message: 'Tạo sách thành công!', sach: newSach });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
};
```

---

## 🧪 Test API với Postman/Thunder Client

### 1. Lấy danh sách sách

```bash
GET http://localhost:3000/api/books/getSach
```

### 2. Thêm sách mới

```bash
POST http://localhost:3000/api/books/createSach
Content-Type: application/json

{
  "MaDauSach": "DS001",
  "NhaXB": "NXB Kim Đồng",
  "NamXB": 2020,
  "SoLuongTon": 50
}
```

### 3. Sửa sách

```bash
PATCH http://localhost:3000/api/books/updateSach/S001
Content-Type: application/json

{
  "NhaXB": "NXB Trẻ",
  "NamXB": 2021,
  "SoLuongTon": 75
}
```

### 4. Xóa sách

```bash
DELETE http://localhost:3000/api/books/deleteSach/S001
```

---

## 📌 Lưu ý

1. **Mã sách (MaSach)** được tạo tự động theo format `S001`, `S002`, ...
2. **MaDauSach** phải tồn tại trong bảng DAUSACH trước khi tạo sách
3. Khi xóa sách có liên kết với hóa đơn/phiếu nhập, hệ thống sẽ báo lỗi (Foreign Key Constraint)
4. Tất cả API đều trả về JSON format nhất quán

---

## 🎯 Kết luận

Code đã được cải thiện theo đúng pattern của **customerController**:

- ✅ Cấu trúc rõ ràng, dễ maintain
- ✅ Error handling đầy đủ
- ✅ Comments chi tiết
- ✅ Routes naming nhất quán
- ✅ Response format thống nhất
