'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Assistant extends Model {
        /**
         * Helper method for defining associations.
         */
        static associate(models) {
            Assistant.belongsToMany(models.Class, {
                through: 'Class_Assistant',
                foreignKey: 'assistantId',
                otherKey: 'classId',
                as: 'classes'
            });
        }
    }
    Assistant.init({
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
        }
    }, {
        sequelize,
        modelName: 'Assistant',
        tableName: 'Assistants'
    });
    return Assistant;
};