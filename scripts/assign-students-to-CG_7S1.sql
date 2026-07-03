-- Gán 35 học sinh ĐÃ CÓ trong DB vào lớp CG_7S1 (Postgres / Neon)
-- Dò theo fullName + lọc school/parentEmail mặc định để đúng lô vừa thêm.
-- NOT EXISTS => chạy lại nhiều lần cũng không tạo bản ghi gán trùng.

-- BƯỚC 1 (kiểm tra trước khi gán): phải trả về ĐÚNG 35 dòng.
-- SELECT id, "fullName", "DOB", "parentPhoneNumber"
-- FROM "Students"
-- WHERE "school" = 'THCS Cầu Giấy'
--   AND "parentEmail" = 'quangphonghd14@gmail.com'
--   AND "fullName" IN (
--       'Bùi Bình Minh','Đặng Hải Nam','Đào Vũ Hà Linh','Đỗ Hải Đăng','Đỗ Hoàng Anh',
--       'Hà Quang Anh','Hoàng Anh Kiệt','Hoàng Vũ Bảo Phương','Lê Bảo Nguyên','Lê Minh Châu',
--       'Lê Phạm Minh Phúc','Nguyễn Bùi Minh Kỳ','Nguyễn Hương Thảo','Nguyễn Lê Hữu Nguyên','Nguyễn Lê Tường Vy',
--       'Nguyễn Ngọc Bảo Châu','Nguyễn Quỳnh Chi','Nguyễn Thành Vinh','Nguyễn Tiến','Nguyễn Tiến Minh',
--       'Nguyễn Tuấn Tú','Phạm Quân Bảo','Phan Minh Anh','Trần Anh Nghĩa','Trần Đức Duy',
--       'Trần Lê Hải Anh','Trần Thanh Phong','Trịnh Thái Bảo',
--       'Lã Ngọc Thảo','Chu Nam Khánh','Nguyễn Đắc Minh Quang','Đỗ Nhật Minh','Trần Phạm Bảo Long',
--       'Nguyễn Quang Anh','Phạm Minh Châu'
--   )
-- ORDER BY id;

-- BƯỚC 2: gán vào lớp.
BEGIN;

INSERT INTO "Student_Classes" ("studentId", "classId", "createdAt", "updatedAt")
SELECT s.id, c.id, NOW(), NOW()
FROM "Students" s
CROSS JOIN "Classes" c
WHERE c."className" = 'CG_7S1'
  AND s."school" = 'THCS Cầu Giấy'
  AND s."parentEmail" = 'quangphonghd14@gmail.com'
  AND s."fullName" IN (
      'Bùi Bình Minh','Đặng Hải Nam','Đào Vũ Hà Linh','Đỗ Hải Đăng','Đỗ Hoàng Anh',
      'Hà Quang Anh','Hoàng Anh Kiệt','Hoàng Vũ Bảo Phương','Lê Bảo Nguyên','Lê Minh Châu',
      'Lê Phạm Minh Phúc','Nguyễn Bùi Minh Kỳ','Nguyễn Hương Thảo','Nguyễn Lê Hữu Nguyên','Nguyễn Lê Tường Vy',
      'Nguyễn Ngọc Bảo Châu','Nguyễn Quỳnh Chi','Nguyễn Thành Vinh','Nguyễn Tiến','Nguyễn Tiến Minh',
      'Nguyễn Tuấn Tú','Phạm Quân Bảo','Phan Minh Anh','Trần Anh Nghĩa','Trần Đức Duy',
      'Trần Lê Hải Anh','Trần Thanh Phong','Trịnh Thái Bảo',
      'Lã Ngọc Thảo','Chu Nam Khánh','Nguyễn Đắc Minh Quang','Đỗ Nhật Minh','Trần Phạm Bảo Long',
      'Nguyễn Quang Anh','Phạm Minh Châu'
  )
  AND NOT EXISTS (
      SELECT 1 FROM "Student_Classes" sc
      WHERE sc."studentId" = s.id AND sc."classId" = c.id
  );

-- Phải báo "INSERT 0 35". Nếu khác 35 thì ROLLBACK và kiểm tra lại BƯỚC 1.
COMMIT;
