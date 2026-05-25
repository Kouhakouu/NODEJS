"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Course extends Model {
        static associate(models) {
            Course.belongsTo(models.Teacher, { foreignKey: "teacherId", as: "teacher" });
        }
    }

    Course.init(
        {
            title: {
                type: DataTypes.STRING,
                allowNull: false
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            teacherId: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            price: {
                type: DataTypes.FLOAT,
                allowNull: false,
                defaultValue: 0
            },
            isPublished: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            tag: {
                type: DataTypes.STRING,
                allowNull: true
            }
        },
        {
            sequelize,
            modelName: "Course",
            timestamps: true
        }
    );

    return Course;
};
