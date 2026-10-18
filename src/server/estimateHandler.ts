import { GoogleGenAI, Type } from '@google/genai';
import { calculatePumsemEstimate, ServiceCategoryKey } from '../utils/pumsemCalculator';
import {
  checkCostAndRateLimit,
  recordApiCall,
  calculateCallCostKRW,
  COST_CONTROL_CONFIG,
} from './costControl';
import { verifyAndConsumeTicket } from './ticketStore';

// Gemini Structured Analysis Schema
const geminiAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    detectedCategory: {
      type: Type.STRING,
      description: '인식된 주요 공종: demolition, waterproofing, interior, bathroom, deck, plumbing_metal 중 1개',
    },
    categoryConfidence: {
      type: Type.NUMBER,
      description: '인식 신뢰도 (0.0 ~ 1.0)',
    },
    surfaceCondition: {
      type: Type.STRING,
      description: '사진에서 육안 확인된 마감재 및 현장 상태 요약 1문장 (예: "기존 타일 줄눈 탈락 및 3차 방수층 재시공 요망")',
    },
    damageSeverity: {
      type: Type.STRING,
      description: '작업 난이도 및 손상 정도: 경미, 보통, 심각 중 하나',
    },
    detectedElements: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '사진 속 식별된 시공/철거 대상 요소 3~5가지 (예: "주방 방수턱", "데코타일 본드층", "석고 가벽", "배수 트렌치")',
    },
    recommendedScope: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '국토교통부 표준품셈 기준 권장 공정 단계 3~4가지',
    },
    uncertainItems: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '사진만으로는 확인 불가하여 착공 전 현장 정밀 실측이 반드시 필요한 불확실 항목 2~4가지 (예: "슬래브 내부 침투 누수 심도", "바닥 몰탈층 두께 및 레벨 오차", "배관 내부 슬러지 고착 여부")',
    },
    wasteTonsEstimated: {
      type: Type.STRING,
      description: '예상 건설폐기물 발생량 (예: "약 1.5톤 ~ 2.5톤 (1톤 트럭 2대 분량)")',
    },
    siteKeyRisk: {
      type: Type.STRING,
      description: '현장 시공 시 추가비용 발생을 예방하기 위한 전문 엔지니어의 핵심 조언',
    },
  },
  required: [
    'detectedCategory',
    'categoryConfidence',
    'surfaceCondition',
    'damageSeverity',
    'detectedElements',
    'recommendedScope',
    'uncertainItems',
    'wasteTonsEstimated',
    'siteKeyRisk',
  ],
};

function withTimeout<T>(promise: Promise<T>, ms: number, errMsg = '요청 제한 시간 초과'): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errMsg)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface EstimateRequestPayload {
  imageBase64?: string;
  category?: string;
  pyeong?: number | string;
  floor?: string;
  hasElevator?: boolean;
  additionalNotes?: string;
  ticketToken?: string;
  ticketId?: string;
}

export interface EstimateResponseResult {
  statusCode: number;
  data: Record<string, unknown>;
}

export async function processEstimateRequest(
  payload: EstimateRequestPayload,
  clientIp: string
): Promise<EstimateResponseResult> {
  const startTime = Date.now();

  // 0. [핵심 보안 원칙] 1,000원 유료회원 이용권 결제 확인 전에는 Gemini AI 분석 및 견적 계산 엔진 절대 실행 금지
  const ticketToken = payload.ticketToken || payload.ticketId;
  const ticketCheck = verifyAndConsumeTicket(ticketToken, {
    category: payload.category,
    pyeong: Number(payload.pyeong) || undefined,
  });

  if (!ticketCheck.valid) {
    return {
      statusCode: ticketCheck.statusCode || 402,
      data: {
        success: false,
        paymentRequired: true,
        error:
          ticketCheck.error ||
          'AI 견적 분석을 위해서는 1,000원 유료회원 이용권 결제가 필요합니다. 결제 후 이용해 주세요.',
      },
    };
  }

  // 1. 비용 및 빈도 제한 검증 (서킷 브레이커 & Rate Limiting)
  const costCheck = checkCostAndRateLimit(clientIp);
  if (!costCheck.allowed) {
    if (costCheck.circuitBreakerActive) {
      // 예산 초과 또는 일일 한도 초과 시: 에러 대신 표준품셈 모드로 자연스럽게 전환
      const fallbackCalculation = calculatePumsemEstimate({
        category: (payload.category as ServiceCategoryKey) || 'demolition',
        pyeong: Number(payload.pyeong) || 10,
        floor: String(payload.floor || '1층'),
        hasElevator: Boolean(payload.hasElevator ?? true),
        damageSeverity: '보통',
      });

      recordApiCall({
        clientIp,
        model: 'none (circuit-breaker)',
        status: 'CIRCUIT_BREAKER',
        latencyMs: Date.now() - startTime,
        errorMessage: costCheck.reason,
      });

      return {
        statusCode: 200,
        data: {
          success: true,
          isCircuitBreakerActive: true,
          message: costCheck.reason,
          aiAnalysis: {
            detectedCategory: payload.category || 'demolition',
            categoryConfidence: 0.9,
            surfaceCondition: '월간 예산 보호 모드 (표준품셈 정량 산정)',
            damageSeverity: '보통',
            detectedElements: ['표준 공종 마감재', '가설 및 철거 부위', '폐기물 반출 대상'],
            recommendedScope: [
              '현장 보양 및 가설 작업',
              '주요 공정 표준 시공 및 정리',
              '건설폐기물 올바로 시스템 적법 반출',
            ],
            uncertainItems: [
              '슬래브 및 몰탈층 두께 (현장 계측 필수)',
              '하부 방수층 누수 침투 심도 (수분 측정 필수)',
              '배관 내부 노후도 및 수압 상태',
            ],
            wasteTonsEstimated: `약 ${(Number(payload.pyeong || 10) * 0.15).toFixed(1)}톤 예상`,
            siteKeyRisk: '공사 착공 전 24시 직통 엔지니어와 무료 현장 방문 실측을 권장합니다.',
          },
          calculationReport: fallbackCalculation,
          ticketId: ticketCheck.ticket?.ticketId,
        },
      };
    }

    // 동일 IP 단시간 반복 요청 차단 (429)
    recordApiCall({
      clientIp,
      model: 'none (rate-limit)',
      status: 'RATE_LIMITED',
      latencyMs: Date.now() - startTime,
      errorMessage: costCheck.reason,
    });

    return {
      statusCode: costCheck.statusCode || 429,
      data: {
        success: false,
        error: costCheck.reason || '요청 횟수가 너무 많습니다. 5분 후 다시 시도해 주세요.',
      },
    };
  }

  const {
    imageBase64,
    category = 'demolition',
    pyeong = 15,
    floor = '1층',
    hasElevator = true,
    additionalNotes = '',
  } = payload;

  // 2. 입력값 및 이미지 유효성 검증
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return {
      statusCode: 400,
      data: {
        success: false,
        error: '분석할 현장 사진 데이터가 누락되었습니다. 사진을 업로드해 주세요.',
      },
    };
  }

  let mimeType = 'image/jpeg';
  let base64Data = imageBase64;
  const match = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (match) {
    mimeType = match[1];
    base64Data = match[2];
  }

  // 3. 이미지 용량 제한: 최대 5MB (비용 및 대역폭 보호)
  if (base64Data.length > COST_CONTROL_CONFIG.MAX_IMAGE_SIZE_BYTES) {
    return {
      statusCode: 413,
      data: {
        success: false,
        error: '사진 크기가 5MB를 초과합니다. 스마트폰 촬영 또는 압축된 사진을 선택해 주세요.',
      },
    };
  }

  const ai = getGeminiClient();

  // 4. API 키 부재 시 안전 처리
  if (!ai) {
    const calculation = calculatePumsemEstimate({
      category: category as ServiceCategoryKey,
      pyeong: Number(pyeong) || 10,
      floor: String(floor),
      hasElevator: Boolean(hasElevator),
      damageSeverity: '보통',
    });

    return {
      statusCode: 200,
      data: {
        success: true,
        isApiKeyMissing: true,
        message: 'Gemini API 키가 아직 설정되지 않아 기본 표준품셈 기준 견적이 산출되었습니다.',
        aiAnalysis: {
          detectedCategory: category,
          categoryConfidence: 0.9,
          surfaceCondition: '기본 공종 기준 상태 (Gemini API 키 미연결)',
          damageSeverity: '보통',
          detectedElements: ['현장 마감재 철거 대상', '폐기물 반출 대상', '정리 및 보양 대상'],
          recommendedScope: [
            '현장 보양 및 가설 작업',
            '주요 공정 철거 및 바탕면 연삭·정리',
            '폐기물 상차 및 올바로 시스템 적법 반출',
          ],
          uncertainItems: [
            '슬래브 바닥 몰탈 두께 (실측 필수)',
            '내부 매립 배관 누수 여부 (수압 계측 필수)',
            '건물 관리실 공사 가이드라인 및 엘리베이터 보양 범위',
          ],
          wasteTonsEstimated: `약 ${(Number(pyeong || 10) * 0.15).toFixed(1)}톤 예상`,
          siteKeyRisk: '공사 착공 전 반드시 24시 직통 엔지니어와 무료 현장 실측을 진행하시기 바랍니다.',
        },
        calculationReport: calculation,
        ticketId: ticketCheck.ticket?.ticketId,
      },
    };
  }

  // 5. 실제 Gemini API 호출 및 토큰/비용 추적
  try {
    const promptText = `
당신은 대한민국 국토교통부 건설공사 표준품셈 및 대한건설협회 시중노임단가 기준을 철저히 준수하는 25년 경력의 건축·철거·인테리어 전문 특급 감리 기술자입니다.

고객이 업로드한 실제 공사 현장 사진을 정밀 시각 분석하여 JSON 형식으로 응답해 주세요.

[고객 입력 현장 정보]
- 신청 공종: ${category}
- 예상 시공 면적: ${pyeong}평 (약 ${(Number(pyeong) * 3.3).toFixed(1)}㎡)
- 현장 층수: ${floor}
- 엘리베이터 여부: ${hasElevator ? '있음' : '없음 (사다리차/계단 양중 필요)'}
- 고객 추가 메모: ${additionalNotes || '없음'}

[분석 지침]
1. 사진에 나타난 마감재 상태, 균열, 누수 흔적, 파손 부위, 배관 노후도 등을 객관적으로 식별하세요.
2. 사진만으로 확인 불가능한 요소(슬래브 두께, 침투 누수 깊이, 매립 배관 상태, 방수층 하부 습기 등)는 절대로 자의적으로 단정하지 말고 반드시 uncertainItems에 명확히 기술하세요.
3. 공사 금액(원화 숫자)은 계산 엔진이 담당하므로 금액을 생성하지 마시고, 작업 범위와 요소 식별에 집중하세요.
`;

    const candidateModels = [
      { name: 'gemini-3.8-flash', timeoutMs: 12000 },
      { name: 'gemini-3.1-flash-lite', timeoutMs: 9000 },
    ];

    let response: any = null;
    let usedModel = 'gemini-3.8-flash';
    let lastError = null;

    for (const candidate of candidateModels) {
      try {
        usedModel = candidate.name;
        response = await withTimeout(
          ai.models.generateContent({
            model: candidate.name,
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: base64Data,
                  },
                },
                {
                  text: promptText,
                },
              ],
            },
            config: {
              responseMimeType: 'application/json',
              responseSchema: geminiAnalysisSchema,
            },
          }),
          candidate.timeoutMs,
          `${candidate.name} 응답 시간 초과`
        );
        if (response && response.text) {
          break;
        }
      } catch (err: unknown) {
        lastError = err;
        console.warn(`[Gemini API] Model ${candidate.name} fallback triggered:`, (err as Error)?.message || err);
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('모든 AI 모델 호출이 일시적으로 실패했습니다.');
    }

    const aiAnalysis = JSON.parse(response.text);
    const latencyMs = Date.now() - startTime;

    // 토큰 사용량 및 예상 비용 산출
    const promptTokens = response.usageMetadata?.promptTokenCount || 0;
    const candidatesTokens = response.usageMetadata?.candidatesTokenCount || 0;
    const estimatedCostKRW = calculateCallCostKRW(usedModel, promptTokens, candidatesTokens);

    recordApiCall({
      clientIp,
      model: usedModel,
      status: 'SUCCESS',
      latencyMs,
      promptTokens,
      candidatesTokens,
    });

    // 표준품셈 계산 엔진 연동
    const targetCategory = (aiAnalysis.detectedCategory as ServiceCategoryKey) || (category as ServiceCategoryKey);
    const damageSeverity = aiAnalysis.damageSeverity || '보통';

    const calculation = calculatePumsemEstimate({
      category: targetCategory,
      pyeong: Number(pyeong) || 10,
      floor: String(floor),
      hasElevator: Boolean(hasElevator),
      damageSeverity,
    });

    return {
      statusCode: 200,
      data: {
        success: true,
        isApiKeyMissing: false,
        aiModel: usedModel,
        aiAnalysis,
        calculationReport: calculation,
        costMetrics: {
          promptTokens,
          candidatesTokens,
          totalTokens: promptTokens + candidatesTokens,
          estimatedCostKRW,
          latencyMs,
        },
        ticketId: ticketCheck.ticket?.ticketId,
      },
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';

    recordApiCall({
      clientIp,
      model: 'gemini-fallback',
      status: 'ERROR',
      latencyMs,
      errorMessage,
    });

    const fallbackCalc = calculatePumsemEstimate({
      category: category as ServiceCategoryKey,
      pyeong: Number(pyeong) || 10,
      floor: String(floor),
      hasElevator: Boolean(hasElevator),
      damageSeverity: '보통',
    });

    return {
      statusCode: 500,
      data: {
        success: false,
        error: `Gemini AI 현장 사진 분석 중 오류가 발생했습니다 (${errorMessage}). 24시 직통상담(010-5306-2233)으로 문의하시면 즉시 무료 방문실측을 도와드립니다.`,
        calculationReport: fallbackCalc,
      },
    };
  }
}
