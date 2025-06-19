// models/manager.js
'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Manager extends Model {
        static associate(models) {
            Manager.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
        }
    }
    Manager.init(
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
            phoneNumber: { type: DataTypes.STRING },          // tuỳ chọn
            gradeLevel: { type: DataTypes.STRING },          // ví dụ: "Grade 10"
        },
        {
            sequelize,
            modelName: 'Manager',
            tableName: 'Managers',
            timestamps: true,
        }
    );
    return Manager;
};
