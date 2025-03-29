"use strict";
module.exports = (sequelize, DataTypes) => {
    const Course = sequelize.define(
        "Course",
        {
            title: DataTypes.STRING,
            description: DataTypes.TEXT,
            teacherId: DataTypes.INTEGER,
            price: DataTypes.FLOAT,
        },
        {}
    );

    Course.associate = function (models) {
        Course.belongsTo(models.Teacher, { foreignKey: "teacherId" });
    };

    return Course;
};
