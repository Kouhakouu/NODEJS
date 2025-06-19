// models/user.js
'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class User extends Model {
        static associate(models) {
            // mỗi user thuộc 1 role
            User.belongsTo(models.Role, { foreignKey: 'roleId', as: 'role' });

            // mỗi user có thể có profile Admin / Assistant / Teacher / Manager
            User.hasOne(models.Admin, { foreignKey: 'userId', as: 'adminProfile' });
            User.hasOne(models.Assistant, { foreignKey: 'userId', as: 'assistantProfile' });
            User.hasOne(models.Teacher, { foreignKey: 'userId', as: 'teacherProfile' });
            User.hasOne(models.Manager, { foreignKey: 'userId', as: 'managerProfile' });
        }
    }
    User.init({
        userId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: { isEmail: true }
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        roleId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Roles',
                key: 'roleId'
            }
        }
    }, {
        sequelize,
        modelName: 'User',
        tableName: 'Users'
    });
    return User;
};
