// models/role.js
'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Role extends Model {
        static associate(models) {
            // 1 role có nhiều user
            Role.hasMany(models.User, { foreignKey: 'roleId', as: 'users' });
        }
    }
    Role.init({
        roleId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        roleName: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        }
    }, {
        sequelize,
        modelName: 'Role',
        tableName: 'Roles'
    });
    return Role;
};
