'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class ClassSchedule extends Model {
        /**
         * Helper method for defining associations.
         */
        static associate(models) {
            ClassSchedule.hasMany(models.Class, { foreignKey: 'class_schedule_id', as: 'classes' });

            ClassSchedule.belongsToMany(models.Lesson, {
                through: models.LessonClassSchedules,
                foreignKey: 'classScheduleId',
                otherKey: 'lessonId',
                as: 'lessons'
            });

        }
    };
    ClassSchedule.init({
        study_day: {
            type: DataTypes.STRING,
            allowNull: false
        },
        start_time: {
            type: DataTypes.TIME,
            allowNull: false
        },
        end_time: {
            type: DataTypes.TIME,
            allowNull: false
        }
    }, {
        sequelize,
        modelName: 'ClassSchedule',
        tableName: 'ClassSchedules'
    });
    return ClassSchedule;
};
