require('dotenv').config({ override: true });
console.log(process.env.username);
module.exports = {
  development: {
    username: process.env.username,
    password: process.env.password,
    database: process.env.database,
    host: process.env.host,
    dialect: "mssql",
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
    dialectOptions: {
      options: {
        encrypt: true,
        trustServerCertificate: true
      }
    },
    logging: false
  }
};
console.log(process.env.username);