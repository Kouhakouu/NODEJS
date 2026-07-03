-- Insert 35 học sinh VÀ gán hết vào lớp CG_7S1 trong 1 transaction (Postgres / Neon)
-- Cột camelCase bắt buộc đặt trong dấu nháy kép "..."
-- CHẠY FILE NÀY THAY CHO insert-students.sql (đừng chạy cả hai kẻo trùng dữ liệu)

BEGIN;

WITH ins AS (
    INSERT INTO "Students" ("fullName", "DOB", "school", "parentPhoneNumber", "parentEmail", "createdAt", "updatedAt")
    VALUES
    -- 28 học sinh chưa đủ thông tin (giá trị mặc định)
    ('Bùi Bình Minh',          '2014-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Đặng Hải Nam',           '2014-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Đào Vũ Hà Linh',         '2014-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Đỗ Hải Đăng',            '2014-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Đỗ Hoàng Anh',           '2014-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Hà Quang Anh',           '2014-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Hoàng Anh Kiệt',         '2014-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Hoàng Vũ Bảo Phương',    '2014-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Lê Bảo Nguyên',          '2014-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Lê Minh Châu',           '2014-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Lê Phạm Minh Phúc',      '2014-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Nguyễn Bùi Minh Kỳ',     '2014-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Nguyễn Hương Thảo',      '2014-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Nguyễn Lê Hữu Nguyên',   '2014-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Nguyễn Lê Tường Vy',     '2014-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Nguyễn Ngọc Bảo Châu',   '2014-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Nguyễn Quỳnh Chi',       '2014-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Nguyễn Thành Vinh',      '2014-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Nguyễn Tiến',            '2014-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Nguyễn Tiến Minh',       '2014-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Nguyễn Tuấn Tú',         '2014-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Phạm Quân Bảo',          '2014-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Phan Minh Anh',          '2014-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Trần Anh Nghĩa',         '2014-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Trần Đức Duy',           '2014-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Trần Lê Hải Anh',        '2014-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Trần Thanh Phong',       '2014-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Trịnh Thái Bảo',         '2014-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    -- 7 học sinh có SĐT + ngày sinh (school & email dùng mặc định)
    ('Lã Ngọc Thảo',           '2014-04-01', 'THCS Cầu Giấy', '0961078181', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Chu Nam Khánh',          '2014-06-23', 'THCS Cầu Giấy', '0948443232', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Nguyễn Đắc Minh Quang',  '2014-02-03', 'THCS Cầu Giấy', '0989332230', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Đỗ Nhật Minh',           '2014-04-21', 'THCS Cầu Giấy', '0977132652', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Trần Phạm Bảo Long',     '2014-05-04', 'THCS Cầu Giấy', '0982051980', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Nguyễn Quang Anh',       '2014-01-30', 'THCS Cầu Giấy', '0902299056', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Phạm Minh Châu',         '2014-03-12', 'THCS Cầu Giấy', '0942186648', 'quangphonghd14@gmail.com', NOW(), NOW())
    RETURNING id
)
INSERT INTO "Student_Classes" ("studentId", "classId", "createdAt", "updatedAt")
SELECT ins.id, c.id, NOW(), NOW()
FROM ins
CROSS JOIN "Classes" c
WHERE c."className" = 'CG_7S1';

-- Kiểm tra: dòng thứ 2 phải báo "INSERT 0 35". Nếu là "INSERT 0 0" => không tìm thấy lớp CG_7S1
-- => ROLLBACK; tạo lớp trước rồi chạy lại. Nếu đúng 35 thì COMMIT.

COMMIT;
