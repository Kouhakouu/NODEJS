-- Thêm 2 học sinh mới VÀ gán vào lớp CG_7S1 trong 1 transaction (Postgres / Neon)
-- Đặng Hải Phong, Nguyễn Trung Hiếu
-- DOB 2014-01-01, school THCS Cầu Giấy, SĐT 0123456789, email quangphonghd14@gmail.com

BEGIN;

WITH ins AS (
    INSERT INTO "Students" ("fullName", "DOB", "school", "parentPhoneNumber", "parentEmail", "createdAt", "updatedAt")
    VALUES
    ('Đặng Hải Phong',    '2014-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Nguyễn Trung Hiếu', '2014-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW())
    RETURNING id
)
INSERT INTO "Student_Classes" ("studentId", "classId", "createdAt", "updatedAt")
SELECT ins.id, c.id, NOW(), NOW()
FROM ins
CROSS JOIN "Classes" c
WHERE c."className" = 'CG_7S1';

-- Lệnh INSERT thứ 2 phải báo "INSERT 0 2". Nếu "INSERT 0 0" => không thấy lớp CG_7S1 => ROLLBACK.
COMMIT;
