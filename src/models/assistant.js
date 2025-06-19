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