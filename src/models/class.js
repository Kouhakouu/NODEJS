'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Class extends Model {
        static associate(models) {
            Class.belongsTo(models.ClassSchedule, { foreignKey: 'class_schedule_id', as: 'classSchedule' });

            Class.hasOne(models.ClassTeacher, { foreignKey: 'class_id', as: 'classTeacher' });

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

            Class.belongsToMany(models.Lesson, {
                through: models.LessonClass,
                foreignKey: 'classId',
                otherKey: 'lessonId',
                as: 'lessons'
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