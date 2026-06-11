'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Assistant extends Model {
        static associate(models) {
            Assistant.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
            // Thêm quan hệ nhiều–nhiều với Class
            Assistant.belongsToMany(models.Class, {
                through: models.Class_Assistant,
                foreignKey: 'assistantId',
                otherKey: 'classId',
                as: 'classes'
            });
        }
    }
    Assistant.init(
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
            phoneNumber: { type: DataTypes.STRING },
            // 0 = chưa kích hoạt (phải làm test + nhập mã), 1 = đã kích hoạt, được dùng web
            status: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
            // Mã xác thực gửi về email, xoá sau khi xác thực thành công
            verifyCode: { type: DataTypes.STRING, allowNull: true },
        },
        {
            sequelize,
            modelName: 'Assistant',
            tableName: 'Assistants',
            timestamps: true
        }
    );
    return Assistant;
};