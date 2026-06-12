require('dotenv').config({ override: true });
const pg = require('pg');

module.exports = {
  development: {
    use_env_variable: 'DATABASE_URL',
    dialect: "postgres",
    dialectModule: pg,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    // Serverless: mỗi instance chỉ xử lý 1 request một lúc, giữ pool nhỏ
    // để không cạn connection của Neon khi nhiều instance cùng chạy
    pool: { max: 2, min: 0, idle: 10000, acquire: 30000 },
    logging: false
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    dialect: "postgres",
    dialectModule: pg,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    pool: { max: 2, min: 0, idle: 10000, acquire: 30000 },
    logging: false
  }
};
