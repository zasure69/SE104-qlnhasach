const request = require('supertest');
const app = require('../index'); 
const resetAndSeedDatabase = require('./test_db_helper');
const jwt = require('jsonwebtoken');

describe('User Operations Module (Customers & Employees)', () => {
  let adminToken; // Token for the seeded admin user
  let staffToken; // Token for the seeded staff user
  let createdCustomerId;
  let createdEmployeeId; // For creating and deleting specific employee

  // Dữ liệu mẫu Customer
  const testCustomer = {
    hoTen: "Nguyen Van Khach Hang",
    // Generate random phone to avoid unique constraint errors on repeated test runs
    soDienThoai: `09${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
    diaChi: "123 Duong Test"
  };

  // Dữ liệu mẫu Employee (will be created in a test case, not setup for all)
  const testEmployee = {
    username: "test_employee_user",
    password: "Password123!",
    hoTen: "Le Van Nhan Vien",
    soDienThoai: "0911222333", // This will be overwritten with random in test
    chucVu: "NhanVien", 
    ngayNhanViec: new Date().toISOString().split('T')[0] 
  };

  beforeAll(async () => {
    await resetAndSeedDatabase(); // Reset and seed the database

    // Generate tokens for the seeded users (NV001 and NV002 from test_db_helper)
    const adminUser = { id: 'NV001', username: 'admin_test', role: 'Admin' };
    adminToken = jwt.sign(adminUser, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });

    const staffUser = { id: 'NV002', username: 'staff_test', role: 'NhanVien' };
    staffToken = jwt.sign(staffUser, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });

  }, 30000); 

  afterAll(async () => {
    // No need to close sequelize here
  });

  // ==========================================
  // MODULE 1: CUSTOMERS (Khách hàng)
  // ==========================================
  describe('A. Quản lý Khách hàng', () => {
    it('POST /api/customers/createCustomers - Tạo khách hàng mới', async () => {
        const res = await request(app)
            .post('/api/customers/createCustomers') 
            .set('Cookie', [`authToken=${adminToken}`])
            .send(testCustomer);
        
        if (res.statusCode !== 201) {
            console.log("Create Customer Failed Response:", res.body);
        }

        expect(res.statusCode).toBe(201);
        expect(res.body.customer).toHaveProperty('MaKhachHang');
        createdCustomerId = res.body.customer.MaKhachHang;
    });

    it('GET /api/customers/getCustomers - Lấy danh sách khách hàng (Có chứa khách hàng vừa tạo)', async () => {
        const res = await request(app)
            .get('/api/customers/getCustomers') 
            .set('Cookie', [`authToken=${adminToken}`]);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        const found = res.body.find(c => c.MaKhachHang === createdCustomerId);
        expect(found).toBeTruthy();
        expect(found.HoVaTen).toBe(testCustomer.hoTen);
    });

    it('PATCH /api/customers/updateCustomers/:id - Cập nhật thông tin khách hàng', async () => {
        const updateData = { diaChi: "456 Duong Moi" };
        const res = await request(app)
            .patch(`/api/customers/updateCustomers/${createdCustomerId}`) 
            .set('Cookie', [`authToken=${adminToken}`])
            .send(updateData);

        expect(res.statusCode).toBe(200);
        expect(res.body.customer.DiaChi).toBe("456 Duong Moi");
    });

    it('DELETE /api/customers/deleteCustomers/:id - Xóa khách hàng', async () => {
        const res = await request(app)
            .delete(`/api/customers/deleteCustomers/${createdCustomerId}`) 
            .set('Cookie', [`authToken=${adminToken}`]);

        expect(res.statusCode).toBe(200);
        
        const check = await request(app)
             .get('/api/customers/getCustomers') 
             .set('Cookie', [`authToken=${adminToken}`]);
        const found = check.body.find(c => c.MaKhachHang === createdCustomerId);
        expect(found).toBeUndefined();
    });
  });

  // ==========================================
  // MODULE 2: EMPLOYEES (Nhân viên)
  // ==========================================
  describe('B. Quản lý Nhân viên (Admin Only)', () => {
      it('POST /api/employees/registerEmployee - Tạo nhân viên mới', async () => {
          const uniqueEmployee = {
              ...testEmployee,
              username: `test_emp_${Date.now()}`,
              soDienThoai: `09${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`
          };

          const res = await request(app)
              .post('/api/employees/registerEmployee')
              .set('Cookie', [`authToken=${adminToken}`])
              .send(uniqueEmployee);

          if (res.statusCode !== 201) {
              console.log("Create Employee Failed:", res.body);
          }

          expect(res.statusCode).toBe(201);
          expect(res.body).toHaveProperty('userId');
          createdEmployeeId = res.body.userId;
      });

      it('GET /api/employees/getEmployees - Lấy danh sách nhân viên', async () => {
          const res = await request(app)
              .get('/api/employees/getEmployees')
              .set('Cookie', [`authToken=${adminToken}`]);
          
          expect(res.statusCode).toBe(200);
          const found = res.body.find(e => e.MaNhanVien === createdEmployeeId);
          expect(found).toBeTruthy();
      });

      it('PATCH /api/employees/updateEmployee/:id - Cập nhật nhân viên', async () => {
          const updateData = { 
              hoTen: "Le Van Nhan Vien Updated",
          };
          const res = await request(app)
            .patch(`/api/employees/updateEmployee/${createdEmployeeId}`)
            .set('Cookie', [`authToken=${adminToken}`])
            .send(updateData);
          
          if (res.statusCode !== 200) {
              console.log("Update Employee Failed:", res.body);
          }

          expect(res.statusCode).toBe(200);
          expect(res.body.user.HoTen).toBe("Le Van Nhan Vien Updated");
      });

      it('DELETE /api/employees/deleteEmployee/:id - Xóa nhân viên', async () => {
          const res = await request(app)
            .delete(`/api/employees/deleteEmployee/${createdEmployeeId}`)
            .set('Cookie', [`authToken=${adminToken}`]);

          expect(res.statusCode).toBe(200);
      });

      it('Non-Admin should NOT be able to access Employee Management APIs', async () => {
        const nonAdminToken = staffToken; // Use the seeded staff user's token
        const employeeToUpdateId = 'NV001'; // Try to update the admin user

        // Try to register an employee as a non-admin
        let res = await request(app)
            .post('/api/employees/registerEmployee')
            .set('Cookie', [`authToken=${nonAdminToken}`])
            .send({ /* some employee data */ });
        expect(res.statusCode).toBe(403);

        // Try to get employees as a non-admin
        res = await request(app)
            .get('/api/employees/getEmployees')
            .set('Cookie', [`authToken=${nonAdminToken}`]);
        expect(res.statusCode).toBe(403);

        // Try to update an employee as a non-admin
        res = await request(app)
            .patch(`/api/employees/updateEmployee/${employeeToUpdateId}`)
            .set('Cookie', [`authToken=${nonAdminToken}`])
            .send({ hoTen: "Should Not Update" });
        expect(res.statusCode).toBe(403);

        // Try to delete an employee as a non-admin
        res = await request(app)
            .delete(`/api/employees/deleteEmployee/${employeeToUpdateId}`)
            .set('Cookie', [`authToken=${nonAdminToken}`]);
        expect(res.statusCode).toBe(403);
      });
  });

});
