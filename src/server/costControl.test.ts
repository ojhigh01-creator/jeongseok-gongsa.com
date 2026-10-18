import assert from 'node:assert';
import {
  COST_CONTROL_CONFIG,
  calculateCallCostKRW,
  checkCostAndRateLimit,
  recordApiCall,
  getCostControlSummary,
  _resetCostControlStateForTesting,
  _setMonthlyCumulativeCostForTesting,
  _setDailyRequestCountForTesting,
} from './costControl';
import { processEstimateRequest } from './estimateHandler';
import { issueTicket, _resetTicketStoreForTesting } from './ticketStore';

console.log('====================================================');
console.log('[정밀 단위 테스트] AI 견적 서비스 비용 통제 모듈 검증');
console.log('====================================================');

let passedTests = 0;
let totalTests = 0;

function it(description: string, testFn: () => void | Promise<void>) {
  totalTests++;
  try {
    const result = testFn();
    if (result instanceof Promise) {
      return result.then(() => {
        passedTests++;
        console.log(`✓ [통과] ${description}`);
      }).catch((err) => {
        console.error(`✗ [실패] ${description}`);
        console.error(err);
        process.exit(1);
      });
    } else {
      passedTests++;
      console.log(`✓ [통과] ${description}`);
    }
  } catch (err) {
    console.error(`✗ [실패] ${description}`);
    console.error(err);
    process.exit(1);
  }
}

async function runAllTests() {
  // TEST GROUP 1: 모델별 토큰 단가 및 환율 환산 공식 검증
  console.log('\n--- 1. 토큰 사용량 기반 건당 원화 비용 산출 검증 ---');

  it('gemini-3.8-flash: 1,000 입력토큰 + 500 출력토큰 = 0.63원 산출', () => {
    // Input: (1,000 / 1,000,000) * 0.15 = $0.00015
    // Output: (500 / 1,000,000) * 0.60 = $0.0003
    // Total USD: $0.00045 * 1400 KRW = 0.63 KRW
    const cost = calculateCallCostKRW('gemini-3.8-flash', 1000, 500);
    assert.strictEqual(cost, 0.63);
  });

  it('gemini-3.1-flash-lite: 1,000 입력토큰 + 500 출력토큰 = 0.315원 산출', () => {
    // Input: (1,000 / 1,000,000) * 0.075 = $0.000075
    // Output: (500 / 1,000,000) * 0.30 = $0.000150
    // Total USD: $0.000225 * 1400 KRW = 0.315 KRW
    const cost = calculateCallCostKRW('gemini-3.1-flash-lite', 1000, 500);
    assert.strictEqual(cost, 0.315);
  });

  it('전형적인 현장 사진 분석 1건(입력 1,500토큰, 출력 600토큰)의 비용은 약 0.819원(1원 미만)', () => {
    const cost = calculateCallCostKRW('gemini-3.8-flash', 1500, 600);
    // (1500/1e6)*0.15 + (600/1e6)*0.60 = 0.000225 + 0.000360 = 0.000585 * 1400 = 0.819 KRW
    assert.strictEqual(cost, 0.819);
  });

  // TEST GROUP 2: 동일 IP 단시간 반복 요청 차단 (5분당 5회)
  console.log('\n--- 2. 동일 IP 악의적/중복 요청 차단 (Rate Limiting) 검증 ---');

  _resetCostControlStateForTesting();

  it('동일 IP에서 5회까지는 요청이 허용됨', () => {
    const ip = '203.0.113.195';
    for (let i = 1; i <= 5; i++) {
      const check = checkCostAndRateLimit(ip);
      assert.strictEqual(check.allowed, true, `${i}회차 요청은 허용되어야 함`);
    }
  });

  it('동일 IP에서 6회째 연속 요청 시 429 및 차단 메시지 반환', () => {
    const ip = '203.0.113.195';
    const check = checkCostAndRateLimit(ip);
    assert.strictEqual(check.allowed, false);
    assert.strictEqual(check.statusCode, 429);
    assert.strictEqual(check.circuitBreakerActive, false);
    assert.ok(check.reason?.includes('5분 후 다시 시도'));
  });

  it('서로 다른 IP는 독립적으로 각자의 요청 한도가 보장됨', () => {
    const otherIp = '198.51.100.42';
    const check = checkCostAndRateLimit(otherIp);
    assert.strictEqual(check.allowed, true);
  });

  // TEST GROUP 3: 일일 최대 100회 한도 검증
  console.log('\n--- 3. 일일 전체 AI 호출 상한선(100회) 검증 ---');

  _resetCostControlStateForTesting();

  it('일일 누적 99건 상태에서 신규 IP 호출 허용', () => {
    _setDailyRequestCountForTesting(99);
    const check = checkCostAndRateLimit('10.0.0.1');
    assert.strictEqual(check.allowed, true);
  });

  it('일일 누적 100건 도달 시 서킷 브레이커 작동 (기본 표준품셈 모드 자동 전환)', () => {
    _setDailyRequestCountForTesting(100);
    const check = checkCostAndRateLimit('10.0.0.2');
    assert.strictEqual(check.allowed, false);
    assert.strictEqual(check.circuitBreakerActive, true);
    assert.strictEqual(check.statusCode, 200);
    assert.ok(check.reason?.includes('일일 허용량(100건)이 마감'));
  });

  // TEST GROUP 4: 월간 예산 20,000원 서킷 브레이커 검증
  console.log('\n--- 4. 월간 예산 20,000원 초과 방지 서킷 브레이커 검증 ---');

  _resetCostControlStateForTesting();

  it('월간 누적 19,990원 상태에서는 신규 요청 허용', () => {
    _setMonthlyCumulativeCostForTesting(19990);
    const check = checkCostAndRateLimit('172.16.0.1');
    assert.strictEqual(check.allowed, true);
  });

  it('월간 누적 20,000원 도달 시 즉각 서킷 브레이커 발동 및 과금 차단', () => {
    _setMonthlyCumulativeCostForTesting(20000);
    const check = checkCostAndRateLimit('172.16.0.2');
    assert.strictEqual(check.allowed, false);
    assert.strictEqual(check.circuitBreakerActive, true);
    assert.strictEqual(check.statusCode, 200);
    assert.ok(check.reason?.includes('월간 AI 시험 운영 예산(20,000원)에 도달'));
  });

  // TEST GROUP 5: 로그 기록 및 IP 마스킹, 사용량 요약
  console.log('\n--- 5. 감사 로그, IP 마스킹, 실시간 사용량 요약 검증 ---');

  _resetCostControlStateForTesting();

  it('API 호출 성공 로그 기록 시 IPv4가 안전하게 마스킹됨 (192.168.*.*)', () => {
    const log = recordApiCall({
      clientIp: '192.168.1.100',
      model: 'gemini-3.8-flash',
      status: 'SUCCESS',
      latencyMs: 1250,
      promptTokens: 1200,
      candidatesTokens: 400,
    });
    assert.strictEqual(log.clientIpMasked, '192.168.*.*');
    assert.strictEqual(log.totalTokens, 1600);
    assert.ok(log.estimatedCostKRW > 0);
  });

  it('실시간 통계 요약 함수가 오늘 날짜, 잔여 예산, 누적 비용을 정확히 집계함', () => {
    const summary = getCostControlSummary();
    assert.strictEqual(summary.dailyRequests, 1);
    assert.strictEqual(summary.dailyLimit, 100);
    assert.strictEqual(summary.monthlyBudgetLimitKRW, 20000);
    assert.ok(summary.budgetRemainingKRW < 20000);
  });

  // TEST GROUP 6: 1,000원 유료회원 이용권 검증 및 핸들러(processEstimateRequest) 무결성 검증
  console.log('\n--- 6. 1,000원 유료회원 이용권 검증 및 견적 핸들러 무결성 검증 ---');

  _resetCostControlStateForTesting();
  _resetTicketStoreForTesting();

  await it('[절대 보안 원칙] 이용권(결제) 없이 /api/estimate 요청 시 402 Payment Required 반환 및 AI/계산 차단', async () => {
    const res = await processEstimateRequest({}, '127.0.0.1');
    assert.strictEqual(res.statusCode, 402);
    assert.strictEqual(res.data.success, false);
    assert.strictEqual(res.data.paymentRequired, true);
    assert.ok((res.data.error as string).includes('1,000원 유료회원 이용권 결제'));
  });

  await it('위조되거나 유효하지 않은 이용권 토큰 전송 시 403 Forbidden 반환', async () => {
    const res = await processEstimateRequest({ ticketToken: 'FAKE_INVALID_TOKEN' }, '127.0.0.1');
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.data.success, false);
    assert.ok((res.data.error as string).includes('유효하지 않은 이용권'));
  });

  await it('정상 1,000원 이용권 발급 및 토큰 검증 성공', async () => {
    const ticket = issueTicket({
      userId: 'USR_01012345678',
      userPhone: '010-1234-5678',
      userName: '테스트고객',
      paymentMethod: 'card',
    });
    assert.strictEqual(ticket.amount, 1000);
    assert.strictEqual(ticket.status, 'active');
    assert.ok(ticket.token.startsWith('TK_'));
  });

  await it('유효한 이용권 보유 시 현장 사진 누락 상태 확인 (400 Bad Request)', async () => {
    const ticket = issueTicket({
      userId: 'USR_01012345678',
      userPhone: '010-1234-5678',
      userName: '테스트고객',
      paymentMethod: 'card',
    });
    const res = await processEstimateRequest({ ticketToken: ticket.token }, '127.0.0.1');
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.data.success, false);
    assert.ok((res.data.error as string).includes('사진 데이터가 누락'));
  });

  await it('이미 사용된 이용권 재사용 시 409 Conflict 반환 (1회권 중복 사용 방지)', async () => {
    // 위 테스트에서 사용된 ticket.token으로 다시 요청
    const allTickets = (await import('./ticketStore')).getAllTickets();
    const usedTicket = allTickets.find((t) => t.status === 'used');
    assert.ok(usedTicket !== undefined);

    const res = await processEstimateRequest({ ticketToken: usedTicket?.token }, '127.0.0.1');
    assert.strictEqual(res.statusCode, 409);
    assert.strictEqual(res.data.success, false);
    assert.ok((res.data.error as string).includes('이미 사용 완료된 이용권'));
  });

  await it('유효한 이용권 제시 시 5MB 초과 대용량 이미지 전송 감지 (413 Payload Too Large)', async () => {
    const ticket = issueTicket({
      userId: 'USR_01012345678',
      userPhone: '010-1234-5678',
      userName: '테스트고객',
      paymentMethod: 'card',
    });
    const largeBase64 = 'data:image/jpeg;base64,' + 'A'.repeat(5 * 1024 * 1024 + 100);
    const res = await processEstimateRequest(
      { imageBase64: largeBase64, ticketToken: ticket.token },
      '127.0.0.1'
    );
    assert.strictEqual(res.statusCode, 413);
    assert.strictEqual(res.data.success, false);
    assert.ok((res.data.error as string).includes('5MB를 초과'));
  });

  await it('월간 예산 도달 상태에서 유효 이용권 요청 시 에러 없이 기본 표준품셈 견적서로 안전 반환 (200 OK)', async () => {
    _resetCostControlStateForTesting();
    _setMonthlyCumulativeCostForTesting(20000);

    const ticket = issueTicket({
      userId: 'USR_01012345678',
      userPhone: '010-1234-5678',
      userName: '테스트고객',
      paymentMethod: 'card',
    });

    const dummyImage =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const res = await processEstimateRequest(
      {
        imageBase64: dummyImage,
        category: 'bathroom',
        pyeong: 4,
        ticketToken: ticket.token,
      },
      '127.0.0.1'
    );

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.isCircuitBreakerActive, true);
    assert.ok(res.data.calculationReport !== undefined);
  });

  console.log('====================================================');
  console.log(`[검증 완료] 비용 통제 모듈 총 ${passedTests}개 검증 항목 통과 (성공률 100%)`);
  console.log('====================================================');
}

runAllTests().catch((err) => {
  console.error('Test suite uncaught error:', err);
  process.exit(1);
});
