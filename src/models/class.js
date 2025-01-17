'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Class extends Model {
        static associate(models) {
            // Một lớp học thuộc về một lịch học
            Class.belongsTo(models.ClassSchedule, { foreignKey: 'class_schedule_id', as: 'classSchedule' });

            // Một lớp học có một giáo viên thông qua ClassTeacher
            Class.hasOne(models.ClassTeacher, { foreignKey: 'class_id', as: 'classTeacher' });

            // Một lớp học có nhiều trợ giảng
            Class.belongsToMany(models.Assistant, {
                through: 'Class_Assistant',
                foreignKey: 'classId',
                otherKey: 'assistantId',
                as: 'assistants'
            });

            Class.belongsToMany(models.Student, {
                through: 'Student_Classes',
                foreignKey: 'classId',
                otherKey: 'studentId',
                as: 'students'
            });
        }
    };
    Class.init({
        className: {
            type: DataTypes.STRING,
            allowNull: false
        },
        gradeLevel: {
            type: DataTypes.STRING,
            allowNull: false
        },
        class_schedule_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'ClassSchedules',
                key: 'id'
            }
        }
    }, {
        sequelize,
        modelName: 'Class',
        tableName: 'Classes'
    });
    return Class;
};