require('dotenv').config({ override: true });
import * as tedious from 'tedious';

module.exports = {
  development: {
    username: 'root',
    password: '14102004',
    database: 'phongbui',
    host: 'localhost',
    dialect: "mssql",
    dialectModule: tedious,
    dialectOptions: {
      options: {
        encrypt: true,
        trustServerCertificate: true
      }
    },
    logging: false
  },
  production: {
    username: process.env.username,
    password: process.env.password,
    database: process.env.database,
    host: process.env.host,
    dialect: "mssql",
    dialectModule: tedious,
    dialectOptions: {
      options: {
        encrypt: true,
        trustServerCertificate: true
      }
    },
    logging: false
  }
};
