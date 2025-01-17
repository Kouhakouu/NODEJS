'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Manager extends Model {
        /**
         * Helper method for defining associations.
         */
        static associate(models) {
            // Một Manager quản lý nhiều Class thông qua gradeLevel
        }
    }
    Manager.init({
        fullName: {
            type: DataTypes.STRING,
            allowNull: false
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },
        phoneNumber: {
            type: DataTypes.STRING,
            allowNull: false
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        gradeLevel: {
            type: DataTypes.STRING,
            allowNull: false
        }
    }, {
        sequelize,
        modelName: 'Manager',
        tableName: 'Managers'
    });
    return Manager;
};
