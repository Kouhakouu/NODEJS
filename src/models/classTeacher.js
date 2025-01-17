'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class ClassTeacher extends Model {
        static associate(models) {
            ClassTeacher.belongsTo(models.Class, { foreignKey: 'class_id', as: 'class' });
            ClassTeacher.belongsTo(models.Teacher, { foreignKey: 'teacher_id', as: 'teacher' });
        }
    };
    ClassTeacher.init({
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true
        },
        class_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Classes',
                key: 'id'
            }
        },
        teacher_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Teachers',
                key: 'id'
            }
        }
    }, {
        sequelize,
        modelName: 'ClassTeacher',
        tableName: 'ClassTeachers'
    });
    return ClassTeacher;
};
