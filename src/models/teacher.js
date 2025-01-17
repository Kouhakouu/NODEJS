'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Teacher extends Model {
        /**
         * Helper method for defining associations.
         */
        static associate(models) {
            // Một giáo viên có một lớp học thông qua ClassTeacher
            Teacher.hasOne(models.ClassTeacher, { foreignKey: 'teacher_id', as: 'classTeacher' });

        }
    };
    Teacher.init({
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
        modelName: 'Teacher',
        tableName: 'Teachers'
    });
    return Teacher;
};
