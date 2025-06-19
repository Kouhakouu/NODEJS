// models/teacher.js
'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Teacher extends Model {
        static associate(models) {
            Teacher.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
        }
    }
    Teacher.init(
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
        },
        {
            sequelize,
            modelName: 'Teacher',
            tableName: 'Teachers',
            timestamps: true,
        }
    );
    return Teacher;
};
