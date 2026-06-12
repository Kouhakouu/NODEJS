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
    logging: false
  }
};
