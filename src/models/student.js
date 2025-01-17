'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Student extends Model {
        /**
         * Helper method for defining associations.
         */
        static associate(models) {
            Student.belongsToMany(models.Class, {
                through: 'Student_Classes',
                foreignKey: 'studentId',
                otherKey: 'classId',
                as: 'classes'
            });
        }
    }
    Student.init({
        fullName: {
            type: DataTypes.STRING,
            allowNull: false
        },
        DOB: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        school: {
            type: DataTypes.STRING,
            allowNull: true
        },
        parentPhoneNumber: {
            type: DataTypes.STRING,
            allowNull: true
        },
        parentEmail: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                isEmail: true
            }
        }
    }, {
        sequelize,
        modelName: 'Student',
        tableName: 'Students'
    });
    return Student;
};
