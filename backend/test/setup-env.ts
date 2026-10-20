process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/orders_test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-0000';
process.env.LOGIN_RATE_LIMIT_PER_ACCOUNT = '1000';
process.env.LOGIN_RATE_LIMIT_PER_IP = '1000';
