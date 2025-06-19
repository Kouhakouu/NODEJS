// models/admin.js
'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Admin extends Model {
        static associate(models) {
            Admin.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
        }
    }
    Admin.init(
        {
            userId: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                allowNull: false,
                references: { model: 'Users', key: 'userId' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            fullName: { type: DataTypes.STRING, allowNull: false },
            phoneNumber: { type: DataTypes.STRING, allowNull: false },
        },
        {
            sequelize,
            modelName: 'Admin',
            tableName: 'Admins',
            timestamps: true,
        }
    );
    return Admin;
};
