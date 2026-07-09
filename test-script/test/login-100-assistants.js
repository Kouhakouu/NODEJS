import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';

const BASE_URL = 'https://nodejs-lovat-sigma.vercel.app';

const assistants = new SharedArray('assistants', function () {
    const csv = open('./assistants.csv');

    return csv
        .replace(/^\uFEFF/, '') // xử lý lỗi BOM nếu file lưu từ Excel
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => {
            const [email, password] = line.split(',');

            return {
                email: email?.trim(),
                password: password?.trim(),
            };
        })
        .filter((item) => item.email && item.password);
});

export const options = {
    scenarios: {
        login_all_assistants_once: {
            executor: 'per-vu-iterations',
            vus: assistants.length,
            iterations: 1,
            maxDuration: '1m',
            gracefulStop: '30s',
        },
    },

    thresholds: {
        'http_req_duration{type:login}': ['p(95)<2000'],
        'http_req_failed{type:login}': ['rate<0.01'],
    },
};

export default function () {
    const index = __VU - 1;
    const assistant = assistants[index];

    const payload = JSON.stringify({
        email: assistant.email,
        password: assistant.password,
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
        tags: {
            type: 'login',
        },
    };

    const res = http.post(`${BASE_URL}/auth/login`, payload, params);

    if (res.status !== 200) {
        console.log(
            `Login failed: ${assistant.email} | status=${res.status} | body=${res.body}`
        );
    }

    check(res, {
        'login status is 200': (r) => r.status === 200,
        'login response time < 2s': (r) => r.timings.duration < 2000,
        'has token': (r) => {
            try {
                return Boolean(r.json('token'));
            } catch {
                return false;
            }
        },
    });
}

export function handleSummary(data) {
    const durationMetric =
        data.metrics['http_req_duration{type:login}'] ||
        data.metrics.http_req_duration;

    const failedMetric =
        data.metrics['http_req_failed{type:login}'] ||
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
KẾT QUẢ KIỂM THỬ HIỆU NĂNG ĐĂNG NHẬP TRỢ GIẢNG
=================================================

Kịch bản kiểm thử:
- Giả lập toàn bộ tài khoản trợ giảng trong file CSV đăng nhập đồng thời
- Mỗi tài khoản gửi 1 request đăng nhập
- Tiêu chí đánh giá:
  + P95 response time < 2000ms
  + Tỉ lệ lỗi < 1%

Tổng quan:
- Tổng số request: ${totalReqs.count ?? 'N/A'}
- Tốc độ request: ${totalReqs.rate ? totalReqs.rate.toFixed(2) + ' req/s' : 'N/A'}
- Tỉ lệ check thành công: ${typeof checks.rate === 'number'
            ? (checks.rate * 100).toFixed(2) + '%'
            : 'N/A'
        }

Thời gian phản hồi API login:
- Trung bình: ${typeof duration.avg === 'number' ? duration.avg.toFixed(2) : 'N/A'} ms
- Min: ${typeof duration.min === 'number' ? duration.min.toFixed(2) : 'N/A'} ms
- Median: ${typeof duration.med === 'number' ? duration.med.toFixed(2) : 'N/A'} ms
- Max: ${typeof duration.max === 'number' ? duration.max.toFixed(2) : 'N/A'} ms
- P90: ${typeof duration['p(90)'] === 'number' ? duration['p(90)'].toFixed(2) : 'N/A'} ms
- P95: ${typeof duration['p(95)'] === 'number' ? duration['p(95)'].toFixed(2) : 'N/A'} ms

Tỉ lệ lỗi:
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
            : '- Chưa đạt yêu cầu về tỉ lệ lỗi: lớn hơn hoặc bằng 1%. Cần kiểm tra lại tài khoản test hoặc lỗi backend.'
        }
`;

    return {
        'result-login-assistants.txt': content,
        stdout: content,
    };
}