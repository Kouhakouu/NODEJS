'use strict';
// Đổi kiểu cột StudentPerformances.totalScore từ INTEGER sang DOUBLE PRECISION.
// Lý do: tổng điểm là tổng các điểm thành phần 0.25 / 0.5 / 0.75 nên có thể là số
// thập phân (vd 1.5), gây lỗi 'invalid input syntax for type integer: "1.5"' khi lưu.
module.exports = {
    up: async (queryInterface) => {
        await queryInterface.sequelize.query(
            `ALTER TABLE "StudentPerformances" ` +
            `ALTER COLUMN "totalScore" TYPE DOUBLE PRECISION ` +
            `USING "totalScore"::double precision`
        );
    },
    down: async (queryInterface) => {
        // Quay lại INTEGER: làm tròn để không mất dữ liệu kiểu (có thể mất phần thập phân).
        await queryInterface.sequelize.query(
            `ALTER TABLE "StudentPerformances" ` +
            `ALTER COLUMN "totalScore" TYPE INTEGER ` +
            `USING ROUND("totalScore")::integer`
        );
    }
};
