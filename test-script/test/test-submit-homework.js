import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';

const BASE_URL = 'https://nodejs-lovat-sigma.vercel.app';

const CLASS_ID = 15;
const LESSON_ID = 12;

const LOGIN_ENDPOINT = '/auth/login';

const testData = new SharedArray('homework performance data', function () {
    const csv = open('./homework-performance.csv');

    return csv
        .replace(/^\uFEFF/, '')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .slice(1) // bỏ header
        .map((line) => {
            const columns = line.split('|');

            return {
                email: columns[0]?.trim(),
                password: columns[1]?.trim(),
                studentId: Number(columns[2]),
                doneTask: Number(columns[3]),
                totalScore: Number(columns[4]),
                incorrectTasks: columns[5]?.trim() || '',
                missingTasks: columns[6]?.trim() || '',
                presentation: columns[7]?.trim() || '',
                skills: columns[8]?.trim() || '',
                comment: columns[9]?.trim() || '',
            };
        })
        .filter((item) => item.email && item.password && item.studentId);
});

console.log(`Loaded ${testData.length} homework submit records`);

export const options = {
    scenarios: {
        submit_homework_once: {
            executor: 'per-vu-iterations',
            vus: testData.length,
            iterations: 1,
            maxDuration: '1m',
            gracefulStop: '30s',
        },
    },

    thresholds: {
        'http_req_duration{type:login}': ['p(95)<2000'],
        'http_req_duration{type:submit_homework}': ['p(95)<2000'],
        'http_req_failed{type:submit_homework}': ['rate<0.01'],
    },
};

export default function () {
    const index = __VU - 1;
    const item = testData[index];

    // 1. Đăng nhập để lấy token
    const loginPayload = JSON.stringify({
        email: item.email,
        password: item.password,
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
            `Login failed: ${item.email} | status=${loginRes.status} | body=${loginRes.body}`
        );
        return;
    }

    // 2. Payload đúng theo request Submit của bạn
    const submitPayload = JSON.stringify({
        studentId: item.studentId,
        lessonId: LESSON_ID,
        performance: {
            doneTask: item.doneTask,
            totalScore: item.totalScore,
            incorrectTasks: item.incorrectTasks,
            missingTasks: item.missingTasks,
            presentation: item.presentation,
            skills: item.skills,
            comment: item.comment,
        },
    });

    const submitRes = http.post(
        `${BASE_URL}/assistant/classes/${CLASS_ID}/lessons/${LESSON_ID}/students-performance`,
        submitPayload,
        {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            tags: {
                type: 'submit_homework',
            },
        }
    );

    if (submitRes.status !== 200 && submitRes.status !== 201) {
        console.log(
            `Submit failed: assistant=${item.email}, studentId=${item.studentId}, status=${submitRes.status}, body=${submitRes.body}`
        );
    }

    check(submitRes, {
        'submit status is 200 or 201': (r) => r.status === 200 || r.status === 201,
        'submit response time < 2s': (r) => r.timings.duration < 2000,
    });
}

export function handleSummary(data) {
    const durationMetric =
        data.metrics['http_req_duration{type:submit_homework}'] ||
        data.metrics.http_req_duration;

    const failedMetric =
        data.metrics['http_req_failed{type:submit_homework}'] ||
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

    const content = `
KẾT QUẢ KIỂM THỬ HIỆU NĂNG CHẤM BÀI TẬP VỀ NHÀ
=================================================

Kịch bản kiểm thử:
- Giả lập nhiều trợ giảng đăng nhập đồng thời
- Mỗi trợ giảng gửi 1 request Submit kết quả chấm bài
- Mỗi request tương ứng với một học sinh trong file homework-performance.csv
- API kiểm thử:
  POST /assistant/classes/${CLASS_ID}/lessons/${LESSON_ID}/students-performance

Tiêu chí đánh giá:
- P95 response time < 2000ms
- Tỉ lệ lỗi < 1%

Tổng quan:
- Tổng số request: ${totalReqs.count ?? 'N/A'}
- Tốc độ request: ${typeof totalReqs.rate === 'number' ? totalReqs.rate.toFixed(2) + ' req/s' : 'N/A'}
- Tỉ lệ check thành công: ${typeof checks.rate === 'number'
            ? (checks.rate * 100).toFixed(2) + '%'
            : 'N/A'
        }

Thời gian phản hồi API chấm bài:
- Trung bình: ${typeof duration.avg === 'number' ? duration.avg.toFixed(2) : 'N/A'} ms
- Min: ${typeof duration.min === 'number' ? duration.min.toFixed(2) : 'N/A'} ms
- Median: ${typeof duration.med === 'number' ? duration.med.toFixed(2) : 'N/A'} ms
- Max: ${typeof duration.max === 'number' ? duration.max.toFixed(2) : 'N/A'} ms
- P90: ${typeof duration['p(90)'] === 'number' ? duration['p(90)'].toFixed(2) : 'N/A'} ms
- P95: ${typeof duration['p(95)'] === 'number' ? duration['p(95)'].toFixed(2) : 'N/A'} ms

Tỉ lệ lỗi API chấm bài:
- Failed rate: ${typeof failedRate === 'number'
            ? (failedRate * 100).toFixed(2) + '%'
            : 'N/A'
        }
- Số request lỗi: ${failed.fails ?? 'N/A'}
- Số request thành công: ${failed.passes ?? 'N/A'}

Kết luận:
${isResponseTimePassed
            ? '- Đạt yêu cầu về thời gian phản hồi: P95 nhỏ hơn 2 giây.'
            : '- Chưa đạt yêu cầu về thời gian phản hồi: P95 lớn hơn hoặc bằng 2 giây.'
        }
${isFailedRatePassed
            ? '- Đạt yêu cầu về tỉ lệ lỗi: nhỏ hơn 1%.'
            : '- Chưa đạt yêu cầu về tỉ lệ lỗi: lớn hơn hoặc bằng 1%. Cần kiểm tra lỗi request, token, dữ liệu học sinh hoặc trạng thái buổi học.'
        }
`;

    return {
        'result-submit-homework.txt': content,
        stdout: content,
    };
}