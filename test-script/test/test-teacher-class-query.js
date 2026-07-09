import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';

const BASE_URL = 'https://nodejs-lovat-sigma.vercel.app';

const LOGIN_ENDPOINT = '/auth/login';

const teachers = new SharedArray('teacher accounts', function () {
    const csv = open('./teachers.csv');

    return csv
        .replace(/^\uFEFF/, '')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => {
            const columns = line.split(',');

            return {
                email: columns[0]?.trim(),
                password: columns[1]?.trim(),
            };
        })
        .filter((item) => item.email && item.password);
});

console.log(`Loaded ${teachers.length} teacher accounts`);

export const options = {
    scenarios: {
        teacher_all_classes_query_once: {
            executor: 'per-vu-iterations',
            vus: teachers.length,
            iterations: 1,
            maxDuration: '2m',
            gracefulStop: '30s',
        },
    },

    thresholds: {
        'http_req_duration{type:login}': ['p(95)<2000'],
        'http_req_duration{type:teacher_classes_list}': ['p(95)<2000'],
        'http_req_duration{type:teacher_class_detail}': ['p(95)<2000'],
        'http_req_failed{type:teacher_class_detail}': ['rate<0.01'],
    },
};

function extractClassIds(classesBody) {
    let data;

    try {
        data = JSON.parse(classesBody);
    } catch (error) {
        return [];
    }

    let classes = [];

    if (Array.isArray(data)) {
        classes = data;
    } else if (Array.isArray(data.data)) {
        classes = data.data;
    } else if (Array.isArray(data.classes)) {
        classes = data.classes;
    } else if (Array.isArray(data.teacherClasses)) {
        classes = data.teacherClasses;
    } else if (Array.isArray(data.results)) {
        classes = data.results;
    }

    const classIds = classes
        .map((item) => {
            return (
                item.id ||
                item.classId ||
                item.ClassId ||
                item.class?.id ||
                item.Class?.id
            );
        })
        .filter((id) => id !== undefined && id !== null);

    return [...new Set(classIds)];
}

export default function () {
    const index = __VU - 1;
    const teacher = teachers[index];

    if (!teacher) {
        console.log(`Không lấy được teacher tại index=${index}`);
        return;
    }

    // 1. Đăng nhập giáo viên
    const loginPayload = JSON.stringify({
        email: teacher.email,
        password: teacher.password,
    });

    const loginRes = http.post(`${BASE_URL}${LOGIN_ENDPOINT}`, loginPayload, {
        headers: {
            'Content-Type': 'application/json',
        },
        tags: {
            type: 'login',
        },
    });

    const token = loginRes.json('token');

    if (!token) {
        console.log(
            `Login failed: ${teacher.email} | status=${loginRes.status} | body=${loginRes.body}`
        );
        return;
    }

    // 2. Lấy toàn bộ danh sách lớp của giáo viên
    const classesRes = http.get(`${BASE_URL}/teacher/classes`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        tags: {
            type: 'teacher_classes_list',
        },
    });

    if (classesRes.status !== 200) {
        console.log(
            `Get classes failed: teacher=${teacher.email}, status=${classesRes.status}, body=${classesRes.body}`
        );
        return;
    }

    const classIds = extractClassIds(classesRes.body);

    if (classIds.length === 0) {
        console.log(
            `Teacher has no class or cannot extract classIds: teacher=${teacher.email}, body=${classesRes.body}`
        );
        return;
    }

    // 3. Giáo viên đọc chi tiết tất cả lớp của mình
    for (const classId of classIds) {
        const detailRes = http.get(`${BASE_URL}/teacher/classes/${classId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            tags: {
                type: 'teacher_class_detail',
            },
        });

        if (detailRes.status !== 200) {
            console.log(
                `Class detail failed: teacher=${teacher.email}, classId=${classId}, status=${detailRes.status}, body=${detailRes.body}`
            );
        }

        check(detailRes, {
            'teacher class detail status is 200': (r) => r.status === 200,
            'teacher class detail response time < 2s': (r) => r.timings.duration < 2000,
        });
    }
}

export function handleSummary(data) {
    const durationMetric =
        data.metrics['http_req_duration{type:teacher_class_detail}'] ||
        data.metrics.http_req_duration;

    const failedMetric =
        data.metrics['http_req_failed{type:teacher_class_detail}'] ||
        data.metrics.http_req_failed;

    const totalReqsMetric = data.metrics.http_reqs;
    const checksMetric = data.metrics.checks;

    const duration = durationMetric?.values || {};
    const failed = failedMetric?.values || {};
    const totalReqs = totalReqsMetric?.values || {};
    const checks = checksMetric?.values || {};

    const p95 = duration['p(95)'];
    const failedRate = failed.rate;

    const isResponseTimePassed = typeof p95 === 'number' && p95 < 2000;
    const isFailedRatePassed = typeof failedRate === 'number' && failedRate < 0.01;

    // Với metric http_req_failed:
    // passes = số request bị lỗi
    // fails = số request không lỗi
    const failedCount = failed.passes ?? 0;
    const successCount = failed.fails ?? 0;
    const detailRequestTotal = failedCount + successCount;

    const content = `
KẾT QUẢ KIỂM THỬ HIỆU NĂNG API TRUY VẤN NHIỀU BẢNG
===================================================

Kịch bản kiểm thử:
- Đọc toàn bộ tài khoản giáo viên trong file teachers.csv
- Mỗi giáo viên đăng nhập để lấy token
- Mỗi giáo viên gọi API GET /teacher/classes để lấy danh sách lớp được quyền truy cập
- Sau đó giáo viên lần lượt gọi API GET /teacher/classes/:id cho tất cả các lớp của mình
- API chi tiết lớp học là API cần kiểm thử vì có truy vấn liên kết nhiều bảng:
  Classes, Lesson_Classes, Lessons, Student_Classes, Students

Tiêu chí đánh giá:
- P95 response time < 2000ms
- Tỉ lệ lỗi < 1%

Tổng quan:
- Tổng số request toàn bài test: ${totalReqs.count ?? 'N/A'}
- Tốc độ request: ${typeof totalReqs.rate === 'number' ? totalReqs.rate.toFixed(2) + ' req/s' : 'N/A'}
- Tỉ lệ check thành công: ${typeof checks.rate === 'number'
            ? (checks.rate * 100).toFixed(2) + '%'
            : 'N/A'
        }

Thời gian phản hồi API chi tiết lớp học:
- Trung bình: ${typeof duration.avg === 'number' ? duration.avg.toFixed(2) : 'N/A'} ms
- Min: ${typeof duration.min === 'number' ? duration.min.toFixed(2) : 'N/A'} ms
- Median: ${typeof duration.med === 'number' ? duration.med.toFixed(2) : 'N/A'} ms
- Max: ${typeof duration.max === 'number' ? duration.max.toFixed(2) : 'N/A'} ms
- P90: ${typeof duration['p(90)'] === 'number' ? duration['p(90)'].toFixed(2) : 'N/A'} ms
- P95: ${typeof duration['p(95)'] === 'number' ? duration['p(95)'].toFixed(2) : 'N/A'} ms

Tỉ lệ lỗi API chi tiết lớp học:
- Failed rate: ${typeof failedRate === 'number'
            ? (failedRate * 100).toFixed(2) + '%'
            : 'N/A'
        }
- Tổng số request chi tiết lớp: ${detailRequestTotal}
- Số request lỗi: ${failedCount}
- Số request thành công: ${successCount}

Kết luận:
${isResponseTimePassed
            ? '- Đạt yêu cầu về thời gian phản hồi: P95 nhỏ hơn 2 giây.'
            : '- Chưa đạt yêu cầu về thời gian phản hồi: P95 lớn hơn hoặc bằng 2 giây.'
        }
${isFailedRatePassed
            ? '- Đạt yêu cầu về tỉ lệ lỗi: nhỏ hơn 1%.'
            : '- Chưa đạt yêu cầu về tỉ lệ lỗi: lớn hơn hoặc bằng 1%. Cần kiểm tra token, quyền truy cập hoặc hiệu năng truy vấn.'
        }

Ghi chú:
- Script không set cứng classId.
- classId được lấy động từ API GET /teacher/classes theo từng tài khoản giáo viên.
- Mỗi giáo viên sẽ đọc chi tiết tất cả lớp mà tài khoản đó được quyền truy cập.
- Đây là request GET nên không làm thay đổi dữ liệu trong database.
`;

    return {
        'result-teacher-class-query.txt': content,
        stdout: content,
    };
}