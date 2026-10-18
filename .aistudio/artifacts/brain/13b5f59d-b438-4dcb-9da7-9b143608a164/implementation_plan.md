# 정석공사 실시간 Gemini AI 현장 사진 자동분석 및 표준품셈 견적 시스템

고객이 업로드한 실제 공사 현장 사진을 서버 측 Google Gemini 3.8 Flash 모델이 고정밀로 심층 분석하고, 별도의 검증 가능한 표준품셈 일위대가 계산 엔진을 통해 투명한 산출 내역과 예비 견적 범위를 제공하는 엔드투엔드 시스템 구축 계획입니다.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> 사용자와의 인터뷰(Q&A)를 통해 확정된 핵심 설계 방향 및 결정 사항입니다.

- **[확정] 단계별 사용자 입력 흐름**: 사진을 업로드한 후, 고객이 1) 공사 유형 선택/확인 및 2) 예상 면적(평수) 및 층수/엘리베이터 조건을 단계별로 입력하여 AI 분석을 요청합니다.
- **[확정] AI 분석 모델**: `gemini-3.8-flash`를 서버 측(`server.ts`)에서 전담 호출하여 육안 확인 가능한 손상 범위, 마감재 상태, 폐기물 유형을 고정밀 분석합니다.
- **[확정] AI와 견적 엔진의 엄격한 역할 분리**: AI는 임의로 공사비 숫자를 생성하지 않으며, 오직 현장 상태 식별·작업 공종 분해·불확실 항목을 객관적으로 분석합니다. 최종 금액은 국토교통부 표준품셈 및 노임단가 기반의 검증된 계산 엔진이 산출합니다.
- **[확정] 불확실성 투명 공개**: 사진만으로 파악 불가능한 슬래브 바닥 두께, 매립 배관 상태, 방수층 침투 깊이 등은 별도의 '현장 정밀 실측 필수 확인 항목'으로 명확히 구분하여 안내합니다.

---

## 1. Overview & Core Concept

### What It Does
- 기존의 가짜 진행률 타이머 기반 시뮬레이터를 제거하고, **실제 서버 측 Gemini API (`gemini-3.8-flash`)**와 연결된 4단계 AI 견적 시스템을 제공합니다.
- 고객이 휴대폰 카메라로 촬영하거나 앨범에서 선택한 현장 사진을 분석하여 다음을 도출합니다:
  1. 감지된 주요 문제점 및 손상 상태 (균열, 누수 흔적, 구도막 들뜸, 타일 파손, 배관 노후 등)
  2. 권장 시공 공정 및 투입 자재 (표준품셈 공종 코드 매핑)
  3. 육안 확인 한계 및 현장 실측 필수 확인 리스트
  4. 재료비 / 노무비 / 장비·공구손료 / 폐기물 처리비 / 부가세(VAT) 분리 세부 내역서 및 최소~최대 견적 범위
- 분석 결과를 확인한 고객은 원클릭으로 24시 직통 상담(`010-5306-2233`) 또는 카카오 1:1 상담으로 바로 연결됩니다.

---

## 2. User Experience & Visual Design

### 4-Step Interactive Flow
```
[1단계: 사진 업로드] ───> [2단계: 현장 조건 입력] ───> [3단계: 실시간 AI 분석] ───> [4단계: 표준품셈 견적 리포트]
• 스마트폰 촬영 / 앨범       • 공사 유형 확인/선택        • 서버측 Gemini 실제 호출       • 감지된 결함 & 권장 공정
• 20MB 이하 실시간 최적화    • 예상 평수 슬라이더/직접입력 • 실제 분석 대기 상태          • 품셈 기반 상세 비용 내역서
• 다중 사진 지원 (최대 10장) • 층수 / 엘리베이터 여부      • 에러/재시도 핸들링           • 실측 필수 불확실 항목 리스트
```

### Visual & Layout Integrity
- 기존 정석공사의 브랜드 색상(`slate-900`, `orange-600`, `emerald-600`)과 타이포그래피(`Pretendard`, `JetBrains Mono` 숫자 폰트)를 100% 보존합니다.
- **Zero-Pill 준수**: 메타데이터와 결과 수치는 알약 배지가 아닌 정돈된 텍스트와 구분자(`·`)로 표현합니다.
- **실시간 반응형 피드백**: AI 분석 중에는 불필요한 가짜 프로그레스 바 대신, 실제 서버 스트림/통신 상태(`"현장 사진 마감재 및 파손 상태 분석 중..."`, `"표준품셈 매핑 중..."`)를 사실적으로 안내합니다.
- **실패 및 예외 안내**: API 키 미설정, 네트워크 지연, 비건축 사진 업로드 시 친절한 한글 안내와 즉시 재시도 버튼을 제공합니다.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Full-Stack Express 서버 (`server.ts`) 도입**
  - *선택*: Express 서버를 엔트리포인트로 설정하여 `/api/ai-estimate` 엔드포인트를 구축하고, 브라우저에는 어떠한 Gemini API 키도 노출하지 않습니다. 개발 환경에서는 `vite.middlewares`를 연동하여 포트 3000에서 단일 구동합니다.
  - *이유*: 브라우저 측 API 키 노출 금지 규칙 준수 및 멀티파트 이미지 페이로드 검증, 호출 빈도 제어(Rate Limit)를 안전하게 처리하기 위함입니다.
- **Decision 2: AI 분석과 단가 산정의 철저한 격리 (Deterministic Engine)**
  - *선택*: AI에게 금액을 직접 묻지 않고, `공사 유형`, `작업 부위`, `손상 등급(경/중/심각)`, `필요 공정 목록`, `예상 폐기물 톤수 범위`, `실측 필요 불확실 요소`만 JSON Schema로 구조화하여 받습니다.
  - *이유*: LLM 환각(Hallucination)으로 인한 비현실적인 공사비 책정을 원천 차단하고, 정부 공인 표준품셈과 2026년 시중노임단가 공식을 100% 일관되게 적용하기 위함입니다.
- **Decision 3: 기존 갤러리 및 Firebase Firestore 실시간 동기화 보존**
  - *선택*: 지난 턴에 구축한 Firebase Firestore 갤러리 동기화 및 관리자 모드(`PIN 2233`), SEO 메타 태그를 그대로 유지하며, `AiEstimateSimulator` 컴포넌트와 백엔드만 고도화합니다.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram
```
┌────────────────────────────────────────────────────────────────────────┐
│                        Client (React 19 + Vite)                        │
│                                                                        │
│  ┌───────────────────────┐         ┌────────────────────────────────┐  │
│  │  AiEstimateSimulator  │ ◄────── │  Standard Pumsem Calculator    │  │
│  │  (Multi-Step UX Flow) │         │  (Deterministic Engine)        │  │
│  └──────────┬────────────┘         └────────────────────────────────┘  │
│             │ POST /api/estimate (Image base64 + User Inputs)          │
└─────────────┼──────────────────────────────────────────────────────────┘
              ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Server-Side (Express + Node)                      │
│                                                                        │
│  ┌───────────────────────┐         ┌────────────────────────────────┐  │
│  │  POST /api/estimate   │ ──────► │  GoogleGenAI SDK               │  │
│  │  - Rate Limiting      │         │  - Model: gemini-3.8-flash     │  │
│  │  - Input Validation   │         │  - Structured JSON Schema      │  │
│  └──────────┬────────────┘         └────────────────┬───────────────┘  │
│             │                                       │                  │
│             │ ◄─────────────────────────────────────┘                  │
│             │ (Parsed Architectural Assessment)                        │
│             ▼                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Pumsem Pricing Calculator (Server Verification)                 │  │
│  │  - Skilled / General Labor Man-Days                              │  │
│  │  - Material Allowance & Equipment Fees                           │  │
│  │  - Waste Disposal Tonnage & Transport Calculation                │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### JSON Schema for Gemini Analysis
```ts
interface GeminiPhotoAnalysis {
  category: 'demolition' | 'waterproofing' | 'interior' | 'bathroom' | 'deck' | 'plumbing_metal';
  categoryConfidence: number; // 0.0 ~ 1.0
  surfaceCondition: string; // 표면 상태 (예: "우레탄 3mm 구도막 박리 및 코너 크랙 발생")
  damageSeverity: 'light' | 'moderate' | 'severe';
  detectedElements: string[]; // 감지된 작업 대상 (예: ["데코타일 25평", "경량가벽 12m", "방수턱"])
  recommendedWorkScope: string[]; // 권장 표준 공정 목록
  uncertainItems: string[]; // 육안 확인 불가능한 실측 필수 항목 (예: ["슬래브 내부 철근 부식 여부", "하부 방수층 누수 심도"])
  estimatedWasteTonsMin: number;
  estimatedWasteTonsMax: number;
  siteAccessibilityRisk: string; // 층수/사다리차/동선상 유의사항
}
```

### Deterministic Pricing Engine Formula
$$\text{기본 노무비} = (\text{특별인부 품수} \times 264,000\text{원}) + (\text{보통인부 품수} \times 165,000\text{원})$$
$$\text{재료비} = (\text{평당 자재 기준가} \times \text{평수}) \times (1 + \text{자재 할증률})$$
$$\text{폐기물·장비비} = (\text{폐기물 톤수} \times 1\text{톤당 } 350,000\text{원}) + \text{기본 장비손료}$$
$$\text{예상 견적 범위} = [\text{합계} \times 0.95, \;\; \text{합계} \times 1.10] \quad (\text{VAT 별도 표기})$$

---

## 5. Verification & Test Plan

1. **실제 Gemini API 호출 테스트**: 유효한 건축 현장 사진 업로드 시 `gemini-3.8-flash`로부터 올바른 JSON 응답 수신 확인.
2. **사진별 차별화 분석 테스트**: 철거 사진 vs 옥상 방수 사진 vs 화장실 사진 업로드 시 서로 다른 결함과 품셈 공정이 정확히 도출되는지 검증.
3. **오류 및 보안 테스트**: API 키 누락 환경 시 사용자 친화적 에러 메시지 표출 확인 및 브라우저 네트워크 탭에 API 키 노출이 전혀 없음을 확인.
4. **불확실성 분리 표기 테스트**: 매립 배관, 내부 방수 상태 등 육안 불가 항목이 결과 화면에 명확히 별도 표기되는지 확인.
5. **빌드 및 린트 검증**: `npm run build` 및 `npm run lint` 통과 확인.
