'use strict';
// One-off script: generate SQL INSERT statements for a batch of new Assistants
// (Users + Assistants tables), following convention:
//   email = ho+ten khong dau, khong cach, viet thuong + "@cmath.com"
//   password (raw) = ngay sinh dang DDMMYYYY, hashed with bcrypt (cost 10) like createAssistant controller
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const data = [
    ['Lê Minh Tuệ', '18/06/2011'],
    ['Phạm Ngọc Sơn', '24/01/2008'],
    ['Trương Tú Uyên', '12/12/2004'],
    ['Trần Anh Quân', '21/11/2007'],
    ['Phạm Công Minh', '11/05/2007'],
    ['Trần Hà Hoa Phương', '03/02/2006'],
    ['Nguyễn Tuấn Minh', '19/02/2007'],
    ['Vũ Hải Đăng', '10/08/2008'],
    ['Nào Bá Khái', '19/01/2006'],
    ['Phạm Thị Ngọc Anh', '09/03/2006'],
    ['Nguyễn Bá Gia Vinh', '02/02/2007'],
    ['Nguyễn Thị Thùy Linh', '29/09/2004'],
    ['Lương Thị Phương Thảo', '18/06/2004'],
    ['Lê Mai Anh', '09/04/2007'],
    ['Bùi Quang Phong', '14/10/2004'],
    ['Nguyễn Văn Tiến', '01/06/2002'],
    ['Nguyễn Yến Nhi', '03/03/2004'],
    ['Đỗ Phương Linh', '13/09/2007'],
    ['Phạm Thị Thanh Ngân', '30/07/2005'],
    ['Bùi Hằng Nga', '31/12/2005'],
    ['Phạm Khánh Toàn', '22/03/2004'],
    ['Bùi Khánh Duy', '28/10/2008'],
    ['Phạm Hoàng Diệu', '10/02/2004'],
    ['Nguyễn Mai Hoa', '02/05/2004'],
    ['Đoàn Thùy Dương', '16/11/2006'],
    ['Nguyễn Đình Giang', '18/04/2005'],
    ['Ngô Phương Linh', '09/01/2004'],
    ['Nguyễn Thị Ngọc Ánh', '16/02/2004'],
    ['Nguyễn Lê Anh', '01/02/2008'],
    ['Phạm Thị Nguyên', '26/09/2003'],
    ['Trần Thị Huế', '02/10/2004'],
    ['Trần Thị Ngân', '01/12/2005'],
    ['Nguyễn Quang Minh', '06/11/2006'],
    ['Nguyễn Đức Tài', '26/07/2003'],
    ['Nguyễn Công Hùng', '27/11/2001'],
    ['Phạm Duy Bách', '18/04/2009'],
    ['Nguyễn Hồng Phúc', '24/01/2004'],
    ['Bùi Thị Thúy An', '16/01/2003'],
    ['Nguyễn Bảo Nhi', '11/02/2008'],
    ['Nguyễn Gia Huy', '06/08/2006'],
    ['Trần Đức Nhiên', '16/07/2006'],
    ['Đặng Tiến Thành', '21/08/2008'],
    ['Phan Thị Quỳnh Chi', '05/09/2005'],
    ['Nguyễn Hoài Anh', '10/04/2006'],
    ['Nguyễn Thành Huấn', '01/09/2006'],
    ['Nguyễn Minh Anh', '11/11/2006'],
    ['Nguyễn Trần Nhật Minh', '07/11/2006'],
    ['Nguyễn Thanh Mai', '07/11/2004'],
    ['Phạm Thị Minh Ánh', '29/10/2006'],
    ['Nghiêm Trường Huy', '20/08/2006'],
    ['Nguyễn Anh Quân', '27/01/2006'],
    ['Nguyễn Ngọc Bảo', '02/11/2006'],
    ['Vũ Trọng Nghĩa', '16/12/2006'],
    ['Phạm Thành Trung', '06/11/2005'],
    ['Ngô Phương Linh Đan', '12/08/2006'],
    ['Tạ Yến Nhi', '30/03/2006'],
    ['Lê Ngọc Dung', '05/02/2006'],
    ['Đặng Anh Bổng', '09/01/2006'],
    ['Nguyễn Thị Mỹ Duyên', '21/05/2006'],
    ['Tạ Ngọc Hiển', '26/10/2007'],
    ['Lê Tuyết Linh', '12/11/2005'],
    ['Hoàng Thúy Nga', '22/12/2004'],
    ['Nguyễn Đức Huy', '14/10/2006'],
    ['Phạm Phương Linh', '03/08/2006'],
    ['Khuất Trung Lương', '15/10/2006'],
    ['Bùi Minh Thái', '22/03/2006'],
    ['Trần Huy Toàn', '15/05/2004'],
    ['Đỗ Thị Nhung', '07/04/2004'],
    ['Nguyễn Ngọc Phương Uyên', '01/11/2006'],
    ['Nguyễn Diệu Linh', '21/11/2006'],
    ['Nguyễn Viết Hiếu', '05/10/2006'],
    ['Nguyễn Văn Quyết', '26/04/2005'],
    ['Nguyễn Quốc Bảo', '31/01/2005'],
    ['Văn Đào Hà My', '09/05/2008'],
    ['Nguyễn Hà An', '22/09/2002'],
    ['Nguyễn Hữu Trí', '07/03/2009'],
    ['Phan Nguyễn Quang Minh', '20/09/2009'],
    ['Nguyễn Minh Quân', '05/03/2006'],
    ['Đỗ Minh Huyền', '26/06/2005'],
    ['Phạm Đức Huy', '13/02/2006'],
    ['Hoàng Thị Thu Ly', '16/09/2005'],
    ['Đỗ Lý Minh Hải', '03/10/2003'],
    ['Nguyễn Ngọc Công Thành', '22/04/2006'],
    ['Lương Thị Hiểu Minh', '03/09/2005'],
    ['Mạc Đăng Hiếu', '29/01/2006'],
    ['Nguyễn Minh Trí', '30/11/2006'],
    ['Lê Xuân Lộc', '26/09/2006'],
    ['Vũ Thị Vân Oanh', '10/03/2004'],
    ['Trương Mỹ Tâm', '15/07/2004'],
    ['Nguyễn Bảo Châu', '06/07/2010'],
    ['Vũ Ngọc Diệp', '26/09/2010'],
    ['Trần Vũ Bảo Sơn', '05/10/2010'],
    ['Tống Khánh Giang', '30/03/2010'],
    ['Nguyễn Hà Phương', '17/04/2010'],
    ['Phạm Vũ Minh Trang', '05/10/2007'],
    ['Phạm Gia Hưng', '28/12/2010'],
    ['Đoàn Phương Thảo', '21/10/2006'],
    ['Nguyễn Thanh Quỳnh', '06/01/2003'],
    ['Đinh Quang Huy', '09/07/2009'],
    ['Phạm Đăng Minh', '09/01/2007'],
    ['Nguyễn Diệu Linh', '15/06/2007'],
    ['Nguyễn Tuấn Kiệt', '27/12/2007'],
    ['Nguyễn Đình Dương', '25/10/2007'],
    ['Đinh Thị Út Trinh', '21/01/2007'],
    ['Nguyễn Minh Hoàng', '31/07/2009'],
    ['Mai Đức Huy', '01/02/2007'],
    ['Cao Đại Việt', '07/08/2007'],
    ['Lý Mỹ Duyên', '24/06/2006'],
    ['Nguyễn Phương Nhi', '16/04/2007'],
    ['Hoàng Anh Dũng', '04/05/2006'],
    ['Nguyễn Tiến Lâm', '04/12/2010'],
    ['Vũ Gia Huy', '03/05/2010'],
    ['Lê Thị Hòa', '31/08/2004'],
    ['Lương Thị Thùy Trang', '22/04/2007'],
    ['Phan Thái Nhân', '20/01/2006'],
    ['Nguyễn Đình Nam', '24/11/2006'],
    ['Lê Ngọc Khánh', '02/09/2005'],
    ['Vũ Phi Long', '15/07/2007'],
    ['Phạm Ngọc Nhi', '14/02/2007'],
    ['Lê Khương Duy', '08/11/2009'],
    ['Nguyễn Đức Kiên', '09/09/2009'],
    ['Hà Anh Trúc', '04/02/2010'],
    ['Bùi Diệu Linh', '05/06/2006'],
    ['Đỗ Ngọc Minh Châu', '21/02/2007'],
    ['Trần Nguyên Khải', '04/11/2010'],
    ['Nguyễn Khắc Trung Hiếu', '18/01/2007'],
    ['Phạm Ngọc Hải', '01/01/2006'],
    ['Vũ Tùng Lâm', '08/10/2004'],
    ['Nguyễn Thị Hoài Thương', '14/01/2009'],
    ['Phạm Thị Mỹ Hạnh', '30/10/2006'],
    ['Vũ Khánh Toàn', '07/02/2007'],
    ['Chế Minh Khang', '02/09/2009'],
    ['Hà Gia Khiêm', '24/04/2010'],
    ['Bùi Chí Kiên', '06/06/2010'],
    ['Phạm Thùy Linh', '09/02/2007'],
    ['Ngô Đức Minh Đăng', '26/03/2008'],
    ['Chu Ngọc Việt', '15/04/2009'],
    ['Trương Hải Đăng', '18/03/2009'],
    ['Đỗ Mạnh Hùng', '09/10/2007'],
    ['Trần Hữu Phương', '27/03/2004'],
    ['Bùi Nguyễn Bảo Châu', '09/10/2010'],
    ['Vũ Huy Hoàng', '25/03/2010'],
    ['Vũ Đình Đăng Hiển', '29/09/2007'],
    ['Lê Hồng Bảo Ngọc', '25/02/2006'],
    ['Nguyễn Phúc Nguyên', '21/11/2008'],
    ['Lương Thị Ngọc Huỳnh', '12/12/2007'],
    ['Trương Chí Bình', '28/05/2007'],
    ['Nguyễn Anh Thư', '15/11/2007'],
    ['Ngô Thanh Uyên', '19/09/2008'],
    ['Mai Vệ Khuê', '19/10/2007'],
    ['Lê Thanh Huyền', '22/09/2007'],
    ['Trần Anh Đức', '24/01/2009'],
    ['Hoàng Thanh Bình', '19/07/2006'],
    ['Nguyễn Danh Tùng', '21/11/2011'],
    ['Đinh Thị Mai Phương', '19/10/2001'],
    ['Lỗ Hà Phương', '30/12/2007'],
    ['Lê Thị Trang', '24/12/2001'],
    ['Kim Việt Tiến', '16/03/2006'],
    ['Hán Thu Minh', '04/01/2007'],
    ['Nguyễn Thạch Tú', '21/10/2007'],
];

function removeDiacritics(str) {
    return str
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');
}

function toEmailSlug(fullName) {
    return removeDiacritics(fullName).toLowerCase().replace(/\s+/g, '');
}

function toPassword(dob) {
    const [d, m, y] = dob.split('/');
    return `${d}${m}${y}`;
}

const usedSlugCount = new Map();

const rows = data.map(([fullName, dob]) => {
    const slug = toEmailSlug(fullName);
    const count = (usedSlugCount.get(slug) || 0) + 1;
    usedSlugCount.set(slug, count);
    const email = count === 1 ? `${slug}@cmath.com` : `${slug}${count}@cmath.com`;
    const password = toPassword(dob);
    const hashed = bcrypt.hashSync(password, 10);
    return { fullName, email, password, hashed };
});

let sql = '';
for (const row of rows) {
    sql += `-- ${row.fullName} | ${row.email} | password: ${row.password}\n`;
    sql += `WITH new_user AS (\n`;
    sql += `    INSERT INTO "Users" (email, password, "roleId", "createdAt", "updatedAt")\n`;
    sql += `    VALUES ('${row.email}', '${row.hashed}', 4, NOW(), NOW())\n`;
    sql += `    RETURNING "userId"\n`;
    sql += `)\n`;
    sql += `INSERT INTO "Assistants" ("userId", "fullName", "phoneNumber", status, "verifyCode", "createdAt", "updatedAt")\n`;
    sql += `SELECT "userId", '${row.fullName.replace(/'/g, "''")}', NULL, 0, NULL, NOW(), NOW() FROM new_user;\n\n`;
}

const outDir = path.join(__dirname, 'output');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'insert_assistants.sql'), sql, 'utf8');

console.log(`Generated ${rows.length} INSERT statement pairs -> scripts/output/insert_assistants.sql`);
for (const [slug, count] of usedSlugCount) {
    if (count > 1) console.log(`Duplicate slug "${slug}" -> ${count} variants (suffix 2, 3, ...)`);
}
