const { Sequelize } = require('sequelize');
const config = require('./config.js'); // Adjust path if necessary

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = dbConfig.use_env_variable
    ? new Sequelize(process.env[dbConfig.use_env_variable], dbConfig)
    : new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, dbConfig);

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

module.exports = connectDB;
