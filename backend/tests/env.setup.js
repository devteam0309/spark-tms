// Set test environment variables before any module is loaded
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'spark-tms-test-secret-key-minimum-32-chars!!';
process.env.JWT_EXPIRE = '1h';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.MONGODB_URI = 'mongodb://localhost:27017/spark-tms-test'; // overridden by MongoMemoryServer
