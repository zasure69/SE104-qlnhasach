const request = require('supertest');
const app = require('../index');
const resetAndSeedDatabase = require('./test_db_helper');
const jwt = require('jsonwebtoken');
const sequelize = require('../config/db'); // Import sequelize instance

describe('Web App Tests', () => {
  let adminToken;
  
  beforeAll(async () => {
    await resetAndSeedDatabase(); // Reset and seed the database

    // Generate token for the seeded admin user
    const adminUser = { id: 'NV001', username: 'admin_test', role: 'Admin' };
    adminToken = jwt.sign(adminUser, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
  }, 30000); // Increased timeout for database operations

  afterAll(async () => {
    //await sequelize.close(); // Close the database connection
  });

  describe('Public Routes', () => {
    it('GET /login should return 200', async () => {
      const res = await request(app).get('/login');
      expect(res.statusCode).toEqual(200);
    });

    it('GET / should redirect to /login without token', async () => {
        const res = await request(app).get('/');
        expect(res.statusCode).toEqual(302);
        expect(res.headers.location).toBe('/login');
    });
  });

  describe('Protected Routes Access', () => {
    
    const testProtection = async (path) => {
        const res = await request(app).get(path);
        expect(res.statusCode).toEqual(302);
        expect(res.headers.location).toBe('/login');
    };

    it('GET /dashboard should be protected', async () => testProtection('/dashboard'));
    it('GET /dashboard should return 200 with valid token', async () => {
         const res = await request(app)
           .get('/dashboard')
           .set('Cookie', [`authToken=${adminToken}`]);
        expect(res.statusCode).toEqual(200);
    });

    describe('API Endpoints Protection & Reachability', () => {
        it('GET /api/customers should be protected', async () => testProtection('/api/customers/getCustomers')); // Specific endpoint
        it('GET /api/search should be protected', async () => testProtection('/api/search'));
        it('GET /api/reports should be protected', async () => testProtection('/api/reports/api/report/inventory')); // Specific endpoint
    });
    
    describe('Books API', () => {
         it('GET /api/books/getSach/99999 should return 404 with token (proving auth works)', async () => {
            const res = await request(app)
                .get('/api/books/getSach/99999')
                .set('Cookie', [`authToken=${adminToken}`]);
            expect(res.statusCode).toBe(404); 
        });
    });
  });
});
