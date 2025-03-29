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

            // Quan hệ với Lesson qua join table LessonStudent
            Student.belongsToMany(models.Lesson, {
                through: models.LessonStudent,
                foreignKey: 'studentId',
                otherKey: 'lessonId',
                as: 'lessons'
            });
            // Quan hệ với StudentPerformance qua join table StudentPerformanceStudent
            Student.belongsToMany(models.StudentPerformance, {
                through: models.StudentPerformanceStudent,
                foreignKey: 'studentId',
                otherKey: 'studentPerformanceId',
                as: 'performances'
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
