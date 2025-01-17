'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class ClassSchedule extends Model {
        /**
         * Helper method for defining associations.
         */
        static associate(models) {
            // Một lịch học có thể liên kết với nhiều lớp học
            ClassSchedule.hasMany(models.Class, { foreignKey: 'class_schedule_id', as: 'classes' });
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
