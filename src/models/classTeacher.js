// models/classTeacher.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class ClassTeacher extends Model {
        static associate(models) {
            // ClassTeacher.class_id → Classes.id
            ClassTeacher.belongsTo(models.Class, {
                foreignKey: 'class_id',
                as: 'class'
            });

            // ClassTeacher.teacher_id → Teachers.userId
            ClassTeacher.belongsTo(models.Teacher, {
                foreignKey: 'teacher_id',
                targetKey: 'userId',    // <-- trỏ vào userId, không phải id
                as: 'teacher'
            });
        }
    }

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
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        },
        teacher_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Teachers',
                key: 'userId'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        }
    }, {
        sequelize,
        modelName: 'ClassTeacher',
        tableName: 'ClassTeachers',
        timestamps: true
    });

    return ClassTeacher;
};
