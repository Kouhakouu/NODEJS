-- Thêm 52 học sinh mới VÀ gán vào lớp TX_9S5 trong 1 transaction (Postgres / Neon)
-- Mặc định: DOB 2012-01-01, school THCS Cầu Giấy, SĐT 0123456789, email quangphonghd14@gmail.com
-- 2 bạn "Nguyễn Đức Minh" cùng tên, phân biệt bằng DOB: 2012-07-18 và 2012-07-22

BEGIN;

WITH ins AS (
    INSERT INTO "Students" ("fullName", "DOB", "school", "parentPhoneNumber", "parentEmail", "createdAt", "updatedAt")
    VALUES
    ('Bùi Quốc Vĩnh',            '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Đào Hồ Nguyên',            '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Đinh Phúc Minh',           '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Hoàng Duy Vũ',             '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Hoàng Lê Tuấn Long',       '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Hoàng Minh Hằng',          '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Hoàng Minh Vũ',            '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Hoàng Trần Nguyên',        '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Hoàng Trung Nguyên',       '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Lê Đức Khang',             '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Lê Hoàng Hải',             '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Lê Ngọc Minh Châu',        '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Lê Quang Anh',             '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Lê Xuân Bách',             '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Ngô Minh Đức',             '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Ngô Minh Khánh',           '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Nguyễn Bình',              '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Nguyễn Đăng Khoa',         '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Nguyễn Đặng Trường Giang', '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Nguyễn Đức Minh',          '2012-07-18', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Nguyễn Đức Minh',          '2012-07-22', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Nguyễn Gia Hân',           '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Nguyễn Hải Phong',         '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Nguyễn Hoàng Linh',        '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Nguyễn Hồng Phúc',         '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Nguyễn Minh Phong',        '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Nguyễn Nam Phong',         '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Nguyễn Ngọc Thiện',        '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Nguyễn Quang Minh',        '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Nguyễn Thu Trà',           '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Nguyễn Trí Kiên',          '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Nguyễn Trọng Bình Minh',   '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Nguyễn Trường Giang',      '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Phạm Việt Phương',         '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Phạm Việt Quân',           '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Phan Trần Vũ',             '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Trần Đình Long Vũ',        '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Trần Đức Minh',            '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Trần Minh Anh',            '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Trịnh Bá Tuấn',            '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Trịnh Viết Hải',           '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Trương Hữu Đông Quang',    '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Vũ Gia Huy',               '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Vũ Minh Nhật',             '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Vũ Phúc Minh Quân',        '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Đặng Bảo Quân',            '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Hoàng Hải Dương',          '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Bùi Đức Duy',              '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Kiều Anh Tú',              '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Nguyễn Đình Hoàng',        '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Nguyễn Bá Nam',            '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW()),
    ('Trần Quang Minh',          '2012-01-01', 'THCS Cầu Giấy', '0123456789', 'quangphonghd14@gmail.com', NOW(), NOW())
    RETURNING id
)
INSERT INTO "Student_Classes" ("studentId", "classId", "createdAt", "updatedAt")
SELECT ins.id, c.id, NOW(), NOW()
FROM ins
CROSS JOIN "Classes" c
WHERE c."className" = 'TX_9S5';

-- Lệnh INSERT thứ 2 phải báo "INSERT 0 52". Nếu "INSERT 0 0" => không thấy lớp TX_9S5 => ROLLBACK.
COMMIT;
