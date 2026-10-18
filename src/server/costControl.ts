/**
 * 정석공사 AI 자동견적 서비스 - 비용 통제 및 사용량 관리 모듈
 * 월 30,000원 이하 시험 운영을 위한 다층 방어 체계:
 * 1. 요청당 이미지 용량 및 사진 수 제한 (Vision 토큰 절감)
 * 2. 동일 IP 단시간 반복 호출 차단 (5분당 5회)
 * 3. 서버 일일 최대 호출 한도 (1일 100회)
 * 4. 월간 누적 예산 임계치(20,000원) 도달 시 서킷 브레이커 (자동 품셈 모드 전환)
 * 5. 모델별 단가 기반 건별 예상 비용 및 토큰 사용량 실시간 로깅
 */

export interface ModelPricing {
  inputPerMillionUSD: number;
  outputPerMillionUSD: number;
}

export const COST_CONTROL_CONFIG = {
  // 요청당 이미지 최대 허용 크기: 5MB (기존 20MB에서 대폭 하향하여 대역폭 및 토큰 절감)
  MAX_IMAGE_SIZE_BYTES: 5 * 1024 * 1024,

  // 단일 요청당 최대 사진 장수: 5장
  MAX_PHOTOS_PER_REQUEST: 5,

  // 동일 IP 반복 요청 제한 창: 5분
  IP_RATE_LIMIT_WINDOW_MS: 5 * 60 * 1000,
  MAX_REQUESTS_PER_IP_WINDOW: 5,

  // 서버 전체 일일 최대 AI 호출 허용 횟수: 100회/일
  DAILY_REQUEST_LIMIT: 100,

  // 월간 AI API 예산 임계치 (원화 기준: 20,000원)
  // 도달 시 추가 결제 발생을 막기 위해 서킷 브레이커 작동 (AI 호출 대신 기본 표준품셈 모드로 안전 전환)
  MONTHLY_BUDGET_KRW: 20000,

  // 환율 기준 (USD to KRW)
  EXCHANGE_RATE_USD_TO_KRW: 1400,

  // 모델별 공식 토큰 단가 (1M 토큰당 USD)
  MODEL_PRICING: {
    'gemini-3.8-flash': {
      inputPerMillionUSD: 0.15,
      outputPerMillionUSD: 0.60,
    },
    'gemini-3.1-flash-lite': {
      inputPerMillionUSD: 0.075,
      outputPerMillionUSD: 0.30,
    },
  } as Record<string, ModelPricing>,
};

export interface ApiCallLog {
  timestamp: string;
  clientIpMasked: string;
  model: string;
  status: 'SUCCESS' | 'ERROR' | 'CIRCUIT_BREAKER' | 'RATE_LIMITED';
  latencyMs: number;
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
  estimatedCostKRW: number;
  errorMessage?: string;
}

interface CostTrackerState {
  currentDayString: string;
  dailyRequestCount: number;
  monthlyCumulativeCostKRW: number;
  recentLogs: ApiCallLog[];
}

// In-Memory Rate Limiting & Usage Tracking
const ipTrackerMap = new Map<string, { count: number; resetTime: number }>();

const costTrackerState: CostTrackerState = {
  currentDayString: new Date().toISOString().slice(0, 10),
  dailyRequestCount: 0,
  monthlyCumulativeCostKRW: 0,
  recentLogs: [],
};

const MAX_LOG_HISTORY = 50;

/**
 * IP 주소 마스킹 처리 (개인정보 보호 준수)
 */
function maskIp(ip: string): string {
  if (!ip || ip === 'unknown') return 'unknown';
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.*.*`;
  }
  return ip.slice(0, 8) + '***';
}

/**
 * 일일 카운터 갱신 (자정 기준 초기화)
 */
function checkDayReset() {
  const today = new Date().toISOString().slice(0, 10);
  if (costTrackerState.currentDayString !== today) {
    costTrackerState.currentDayString = today;
    costTrackerState.dailyRequestCount = 0;
  }
}

/**
 * AI 요청 전 비용 및 호출 빈도 검사
 */
export function checkCostAndRateLimit(clientIp: string): {
  allowed: boolean;
  reason?: string;
  statusCode?: number;
  circuitBreakerActive?: boolean;
} {
  checkDayReset();

  // 1. 월간 예산 임계치(20,000원) 초과 검사 (서킷 브레이커)
  if (costTrackerState.monthlyCumulativeCostKRW >= COST_CONTROL_CONFIG.MONTHLY_BUDGET_KRW) {
    return {
      allowed: false,
      reason: '월간 AI 시험 운영 예산(20,000원)에 도달하여 기본 표준품셈 모드로 전환되었습니다. 추가 과금 없이 표준품셈 견적서를 제공합니다.',
      statusCode: 200, // 사용자에게 에러 대신 기본 견적으로 유연하게 안내
      circuitBreakerActive: true,
    };
  }

  // 2. 일일 전체 호출 한도 검사 (100회)
  if (costTrackerState.dailyRequestCount >= COST_CONTROL_CONFIG.DAILY_REQUEST_LIMIT) {
    return {
      allowed: false,
      reason: '금일 AI 사진 분석 일일 허용량(100건)이 마감되었습니다. 기본 표준품셈 모드로 산출해 드립니다.',
      statusCode: 200,
      circuitBreakerActive: true,
    };
  }

  // 3. 동일 IP 반복 요청 제한 (5분당 5회)
  const now = Date.now();
  const ipEntry = ipTrackerMap.get(clientIp);

  if (!ipEntry || now > ipEntry.resetTime) {
    ipTrackerMap.set(clientIp, { count: 1, resetTime: now + COST_CONTROL_CONFIG.IP_RATE_LIMIT_WINDOW_MS });
  } else {
    if (ipEntry.count >= COST_CONTROL_CONFIG.MAX_REQUESTS_PER_IP_WINDOW) {
      return {
        allowed: false,
        reason: '단시간 내 견적 요청이 너무 많습니다. 5분 후 다시 시도해 주세요.',
        statusCode: 429,
        circuitBreakerActive: false,
      };
    }
    ipEntry.count += 1;
  }

  return { allowed: true };
}

/**
 * 건별 토큰 수량에 따른 예상 비용 계산 (원화)
 */
export function calculateCallCostKRW(
  modelName: string,
  promptTokens: number,
  candidatesTokens: number
): number {
  const pricing = COST_CONTROL_CONFIG.MODEL_PRICING[modelName] || COST_CONTROL_CONFIG.MODEL_PRICING['gemini-3.1-flash-lite'];
  const inputCostUSD = (promptTokens / 1_000_000) * pricing.inputPerMillionUSD;
  const outputCostUSD = (candidatesTokens / 1_000_000) * pricing.outputPerMillionUSD;
  const totalCostUSD = inputCostUSD + outputCostUSD;
  const totalCostKRW = totalCostUSD * COST_CONTROL_CONFIG.EXCHANGE_RATE_USD_TO_KRW;
  // 소수점 셋째자리 반올림
  return Number(totalCostKRW.toFixed(3));
}

/**
 * API 호출 완료 후 사용량 및 통계 기록
 */
export function recordApiCall(params: {
  clientIp: string;
  model: string;
  status: 'SUCCESS' | 'ERROR' | 'CIRCUIT_BREAKER' | 'RATE_LIMITED';
  latencyMs: number;
  promptTokens?: number;
  candidatesTokens?: number;
  errorMessage?: string;
}): ApiCallLog {
  checkDayReset();

  const promptTokens = params.promptTokens || 0;
  const candidatesTokens = params.candidatesTokens || 0;
  const totalTokens = promptTokens + candidatesTokens;

  let costKRW = 0;
  if (params.status === 'SUCCESS') {
    costKRW = calculateCallCostKRW(params.model, promptTokens, candidatesTokens);
    costTrackerState.dailyRequestCount += 1;
    costTrackerState.monthlyCumulativeCostKRW = Number(
      (costTrackerState.monthlyCumulativeCostKRW + costKRW).toFixed(2)
    );
  }

  const logEntry: ApiCallLog = {
    timestamp: new Date().toISOString(),
    clientIpMasked: maskIp(params.clientIp),
    model: params.model,
    status: params.status,
    latencyMs: params.latencyMs,
    promptTokens,
    candidatesTokens,
    totalTokens,
    estimatedCostKRW: costKRW,
    errorMessage: params.errorMessage,
  };

  costTrackerState.recentLogs.unshift(logEntry);
  if (costTrackerState.recentLogs.length > MAX_LOG_HISTORY) {
    costTrackerState.recentLogs.pop();
  }

  return logEntry;
}

/**
 * 관리 및 통계 확인용 현재 상태 조회
 */
export function getCostControlSummary() {
  checkDayReset();
  return {
    today: costTrackerState.currentDayString,
    dailyRequests: costTrackerState.dailyRequestCount,
    dailyLimit: COST_CONTROL_CONFIG.DAILY_REQUEST_LIMIT,
    monthlyCumulativeCostKRW: costTrackerState.monthlyCumulativeCostKRW,
    monthlyBudgetLimitKRW: COST_CONTROL_CONFIG.MONTHLY_BUDGET_KRW,
    budgetRemainingKRW: Math.max(0, COST_CONTROL_CONFIG.MONTHLY_BUDGET_KRW - costTrackerState.monthlyCumulativeCostKRW),
    recentLogsCount: costTrackerState.recentLogs.length,
    recentLogs: costTrackerState.recentLogs.slice(0, 5),
  };
}

/**
 * 테스트 전용 상태 초기화 및 시뮬레이션 제어 함수
 */
export function _resetCostControlStateForTesting() {
  ipTrackerMap.clear();
  costTrackerState.dailyRequestCount = 0;
  costTrackerState.monthlyCumulativeCostKRW = 0;
  costTrackerState.recentLogs = [];
  costTrackerState.currentDayString = new Date().toISOString().slice(0, 10);
}

export function _setMonthlyCumulativeCostForTesting(costKRW: number) {
  costTrackerState.monthlyCumulativeCostKRW = costKRW;
}

export function _setDailyRequestCountForTesting(count: number) {
  costTrackerState.dailyRequestCount = count;
}
