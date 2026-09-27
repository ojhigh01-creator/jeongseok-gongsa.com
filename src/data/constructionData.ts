import heroImg from '../assets/images/hero_demolition_renovation_1790395282692.jpg';
import demolitionImg from '../assets/images/service_commercial_demolition_1790395299570.jpg';
import waterproofingImg from '../assets/images/service_waterproofing_exterior_1790395317940.jpg';
import bathroomImg from '../assets/images/service_bathroom_remodeling_1790395329185.jpg';
import deckImg from '../assets/images/service_deck_metalwork_1790395340467.jpg';
import interiorTileImg from '../assets/images/gallery_interior_tile_leveling_1790396785917.jpg';
import plumbingMetalImg from '../assets/images/gallery_plumbing_metal_frame_1790396798875.jpg';
import demolitionSandingImg from '../assets/images/gallery_demolition_sanding_1790396811526.jpg';

export const DIRECT_PHONE = '010-5306-2233';

export type ServiceCategoryKey =
  | 'all'
  | 'demolition'
  | 'waterproofing'
  | 'interior'
  | 'bathroom'
  | 'deck'
  | 'plumbing_metal';

export interface ServicePhotoItem {
  id: string;
  url: string;
  subtitle: string;
  specNote: string;
}

export interface PumsemStandardInfo {
  chapterCode: string; // 예: 건설공사 표준품셈 건축부문 제18장 (철거 및 해체)
  basisDescription: string; // 품셈 적용 세부 기준
  skilledLaborPer10Pyeong: number; // 10평(33㎡)당 특별인부/기능공 표준 품수
  generalLaborPer10Pyeong: number; // 10평(33㎡)당 보통인부 표준 품수
  materialAllowancePct: number; // 표준품셈 자재 할증률 (%)
  equipmentAndToolNote: string; // 공구손료 및 경장비 기준
}

export interface ServiceItem {
  id: string;
  category: ServiceCategoryKey;
  parentCategory?: ServiceCategoryKey;
  categoryLabel: string;
  isSpecialized?: boolean;
  title: string;
  subtitle: string;
  photos: ServicePhotoItem[];
  bulletPoints: [string, string, string];
  duration: string;
  unitPriceLabel: string;
  basePricePerPyeong: number; // 만원 단위
  minFlatCost: number; // 기본 출동/폐기물/양생 기본비 (만원)
  warrantyNote: string;
  pumsem: PumsemStandardInfo;
}

export interface SamplePhotoPreset {
  id: string;
  label: string;
  category: ServiceCategoryKey;
  defaultPyeong: number;
  image: string;
  pumsemAppliedCode: string;
  detectedIssues: string[];
  recommendedScope: string[];
  wasteTons: string;
  manDays: number;
}

export const HERO_VISUAL = heroImg;

export const SERVICE_TABS: { key: ServiceCategoryKey; label: string }[] = [
  { key: 'all', label: '전체 공종' },
  { key: 'demolition', label: '철거·원상복구' },
  { key: 'waterproofing', label: '방수·외벽보수' },
  { key: 'interior', label: '인테리어·리모델링' },
  { key: 'bathroom', label: '화장실 성능개선 (특화)' },
  { key: 'deck', label: '데크시공 (특화)' },
  { key: 'plumbing_metal', label: '설비·금속·기타' },
];

export const SERVICES_DATA: ServiceItem[] = [
  {
    id: 'srv-demolition-commercial',
    category: 'demolition',
    categoryLabel: '철거 · 원상복구',
    title: '상가·오피스 완전 철거 및 임대차 원상복구',
    subtitle: '주방/배관 파쇄부터 타일 샌딩까지 원스톱 상가철거',
    photos: [
      {
        id: 'dem-photo-1',
        url: demolitionImg,
        subtitle: '주방 방수턱 파쇄 및 급배수 배관 정밀 캡핑 마감 현장',
        specNote: '임대차 원상복구 표준 사양 · 콘크리트 슬래브 노출 및 배관 기밀 마감 완료',
      },
      {
        id: 'dem-photo-2',
        url: demolitionSandingImg,
        subtitle: '무분진 집진 다이아몬드 그라인더 바닥 본드·에폭시 완전 샌딩',
        specNote: '바닥 평활도 ±2mm 이내 확보 · 후속 마감재 즉시 시공 가능 상태 인도',
      },
      {
        id: 'dem-photo-3',
        url: heroImg,
        subtitle: '오피스 경량 칸막이·천장 텍스 철거 및 구조체 원형 복원',
        specNote: '건물 관리단 원상복구 체크리스트 100% 충족 검수 완료',
      },
    ],
    bulletPoints: [
      '임대인·관리실 원상복구 체크리스트 사전 대조 및 완결 확인서 대행',
      '무진동 유압 크래셔·집진 그라인더 투입으로 인접 매장 소음·분진 최소화',
      '폐기물 1톤/2.5톤/5톤 실측 정량 정산 및 올바로(Allbaro) 적법 반출 증빙',
    ],
    duration: '평균 1~3일 소요',
    unitPriceLabel: '평당 12만 원~',
    basePricePerPyeong: 12,
    minFlatCost: 85,
    warrantyNote: '임대인 검수 완료 책임 보증',
    pumsem: {
      chapterCode: '건설공사 표준품셈 건축부문 제18장 (철거 및 해체공사)',
      basisDescription: '내장재·칸막이 해체(㎡당 보통인부 0.08품) 및 바닥 모르타르/타일 파쇄·연마 품셈 적용',
      skilledLaborPer10Pyeong: 1.4,
      generalLaborPer10Pyeong: 2.2,
      materialAllowancePct: 3,
      equipmentAndToolNote: '공구손료(노무비의 3%) 및 소형 브레이커·집진 연삭기 기계경비 반영',
    },
  },
  {
    id: 'srv-bathroom-special',
    category: 'bathroom',
    parentCategory: 'interior',
    categoryLabel: '인테리어 · 화장실 성능개선 (특화)',
    isSpecialized: true,
    title: '화장실 성능개선 & 리모델링 (특화)',
    subtitle: '악취 차단 및 방수성능 강화 화장실 리모델링',
    photos: [
      {
        id: 'bath-photo-1',
        url: bathroomImg,
        subtitle: '3차 우레탄 복합 도막방수 후 600×600 포세린 타일 정밀 졸리컷 마감',
        specNote: '24시간 담수 테스트 통과 · 간접 조명 거울 및 무광 니켈 수전 세팅',
      },
      {
        id: 'bath-photo-2',
        url: interiorTileImg,
        subtitle: '레이저 레벨기 기반 스테인리스 선형 트렌치 배수 구배(물매) 시공',
        specNote: '바닥 물고임 제로화 설계 · 이중 봉수 악취 차단 트랩 기본 매립',
      },
      {
        id: 'bath-photo-3',
        url: plumbingMetalImg,
        subtitle: '노후 급수(PB)·배수(VG1) 배관 전면 교체 및 8kgf/cm² 수압 기밀 테스트',
        specNote: '슬래브 층간 누수 원천 차단 · 배관 방음 보온재 2중 감기 시공',
      },
    ],
    bulletPoints: [
      '기존 타일 올철거 후 방수 액체몰탈 + 비노출 우레탄 3회 도막 시공 및 담수 테스트',
      '배수 스텐 트렌치 정밀 물매(구배) 잡기 및 정품 냄새 차단 트랩 기본 장착',
      '친환경 항곰팡이 탄성 줄눈 및 KS 1등급 도기·수전 풀패키지 1년 무상 A/S',
    ],
    duration: '평균 3~5일 소요',
    unitPriceLabel: '칸당 260만 원~ (평당 85만 원~)',
    basePricePerPyeong: 85,
    minFlatCost: 180,
    warrantyNote: '누수·타일 들뜸 1년 무상 A/S',
    pumsem: {
      chapterCode: '건설공사 표준품셈 건축부문 제9장(방수) · 제10장(타일) · 기계설비 제3장(위생기구)',
      basisDescription: '도막방수 3회 칠(㎡당 방수공 0.14품), 자기질 대형 타일 압착붙임(타일공 0.21품) 및 타일 할증 3% 적용',
      skilledLaborPer10Pyeong: 5.8,
      generalLaborPer10Pyeong: 3.1,
      materialAllowancePct: 3,
      equipmentAndToolNote: '타일 커팅·레이저 레벨링 장비 및 급배수 수압 시험기 계측 품셈 반영',
    },
  },
  {
    id: 'srv-deck-special',
    category: 'deck',
    parentCategory: 'interior',
    categoryLabel: '인테리어 · 데크시공 리모델링 (특화)',
    isSpecialized: true,
    title: '데크시공 리모델링 (특화)',
    subtitle: '아연도금 각관 하지 작업부터 고밀도 합성목재 클립 시공까지',
    photos: [
      {
        id: 'deck-photo-1',
        url: deckImg,
        subtitle: '국산 KS 25T 솔리드 고밀도 합성목재(WPC) 스테인리스 클립 히든 시공',
        specNote: '피스 무노출 공법 · 사계절 수축·팽창 대응 유격 5mm 정밀 확보',
      },
      {
        id: 'deck-photo-2',
        url: plumbingMetalImg,
        subtitle: '아연도금 각관(100×50 멍에 / 50×50 장선) 400mm 정석 간격 하지 용접',
        specNote: '용접 부위 방청 프라이머 2회 도포 · 앙카 볼트 바닥 고정 인발력 확보',
      },
      {
        id: 'deck-photo-3',
        url: waterproofingImg,
        subtitle: '루프탑·테라스 하부 방수층 보호용 고무 패드 받침 및 배수로 확보 데크',
        specNote: '하부 방수 손상 방지 비타공/복합 기초 공법 적용',
      },
    ],
    bulletPoints: [
      '방부목 대비 수명 4배 이상인 국산 KS 고비중 25T 합성목재(WPC) 정품 자재 사용',
      '아연도금 각관(50×50 / 100×50) 400mm 이하 촘촘한 정석 멍에·장선 구조 용접',
      '계절별 수축·팽창을 흡수하는 스테인리스 클립 공법으로 뒤틀림 및 피스 자국 제로화',
    ],
    duration: '평균 2~4일 소요',
    unitPriceLabel: '평당 42만 원~',
    basePricePerPyeong: 42,
    minFlatCost: 110,
    warrantyNote: '하지 처짐·들뜸 1년 무상 A/S',
    pumsem: {
      chapterCode: '건설공사 표준품셈 건축부문 제6장(목공사-합성목재 데크) · 제7장(금속공사-경량철골 하지)',
      basisDescription: '철골 각관 틀 제작·설치(철골공+용접공 품) 및 합성목재 바닥판 클립 고정(목공 0.19품/㎡), 목재 할증 5% 적용',
      skilledLaborPer10Pyeong: 3.9,
      generalLaborPer10Pyeong: 2.0,
      materialAllowancePct: 5,
      equipmentAndToolNote: '용접기 경비, 절단석 소모품 및 방청 도료 부자재 표준품셈 일위대가 반영',
    },
  },
  {
    id: 'srv-waterproofing-exterior',
    category: 'waterproofing',
    categoryLabel: '방수 · 외벽보수',
    title: '옥상 우레탄 복합방수 및 외벽 크랙·실리콘 보수',
    subtitle: '하도 침투 프라이머부터 중·상도 3.0mm 표준 도막 두께 100% 준수',
    photos: [
      {
        id: 'wp-photo-1',
        url: waterproofingImg,
        subtitle: 'KS 정품 우레탄 중도 3.0mm 무이음 도막 형성 및 상도 탑코팅 완공',
        specNote: '자외선 차단 내후성 상도 코팅 · 코너부 부직포 보강 시트 일체화 시공',
      },
      {
        id: 'wp-photo-2',
        url: demolitionSandingImg,
        subtitle: '방수 시공 전 옥상 바탕면 레이턴스·들뜬 구도막 전면 다이아몬드 연삭',
        specNote: '접착력 극대화를 위한 바탕 정리 및 습기 배출 에어벤트(탈기반) 설치',
      },
    ],
    bulletPoints: [
      '바탕면 레이턴스 전면 연삭 및 코너부 우레탄 실란트·부직포 보강 시트 선시공',
      '습기 배출용 에어벤트(탈기반) 설치로 하절기 바닥 부풀음 현상 원천 차단',
      '투입 방수 자재 정품 캔 수량 사진 촬영 및 실시간 알림톡 검수 리포트 발송',
    ],
    duration: '평균 3~5일 소요 (양생 포함)',
    unitPriceLabel: '평당 15만 원~',
    basePricePerPyeong: 15,
    minFlatCost: 95,
    warrantyNote: '방수층 누수 1년 무상 A/S',
    pumsem: {
      chapterCode: '건설공사 표준품셈 건축부문 제9장 (방수공사 - 폴리우레탄 고무계 도막방수)',
      basisDescription: '바탕면 정리 후 우레탄 도막방수 두께 3.0mm 기준(㎡당 방수공 0.16품 + 보통인부 0.07품) 및 자재 할증 3% 적용',
      skilledLaborPer10Pyeong: 2.1,
      generalLaborPer10Pyeong: 1.3,
      materialAllowancePct: 3,
      equipmentAndToolNote: '바탕 연삭기, 고압세척기 및 교반기(믹서) 공구손료 반영',
    },
  },
  {
    id: 'srv-interior-remodeling',
    category: 'interior',
    categoryLabel: '인테리어 · 리모델링',
    title: '상업·오피스 실용 인테리어 및 바닥 수평몰탈·타일 공사',
    subtitle: '수평몰탈 정밀 레벨링부터 고강도 포세린 타일·친환경 도장 마감까지',
    photos: [
      {
        id: 'int-photo-1',
        url: interiorTileImg,
        subtitle: '레이저 레벨링 자동 수평몰탈 타설 및 600각 포세린 타일 클립 시공',
        specNote: '단차 0.5mm 이내 정밀 시공 · 상업공간 고하중 내마모성 타일 적용',
      },
      {
        id: 'int-photo-2',
        url: heroImg,
        subtitle: '노출 콘크리트 천장 친환경 에어리스 도장 및 건축 라인 조명 완공',
        specNote: '방염 필증 발급 정품 자재 100% 사용 · 동선 맞춤형 전기/조명 배선',
      },
    ],
    bulletPoints: [
      '불필요한 장식 요소를 덜어내고 내구성과 동선에 집중한 정석 상업·주거 리모델링',
      '레이저 레벨기 기반 자동 수평몰탈 타설 후 포세린 타일·데코타일·에폭시 정밀 시공',
      '공정별 자재 단가표와 일일 투입 노무비(품수)를 계약서 내 100% 투명 공개',
    ],
    duration: '평균 5~14일 소요',
    unitPriceLabel: '평당 68만 원~',
    basePricePerPyeong: 68,
    minFlatCost: 220,
    warrantyNote: '전 공정 1년 무상 시공 A/S',
    pumsem: {
      chapterCode: '건설공사 표준품셈 건축부문 제8장(미장-자동수평몰탈) · 제10장(타일) · 제13장(도장공사)',
      basisDescription: '수평몰탈 바름(미장공 0.09품/㎡), 바닥 타일 붙임(타일공 0.18품/㎡), 수성페인트 2회 롤러/뿜칠 품셈 합산 적용',
      skilledLaborPer10Pyeong: 4.6,
      generalLaborPer10Pyeong: 2.5,
      materialAllowancePct: 4,
      equipmentAndToolNote: '에어리스 도장기, 레이저 레벨기 및 몰탈 교반 펌프 장비비 반영',
    },
  },
  {
    id: 'srv-plumbing-metal',
    category: 'plumbing_metal',
    categoryLabel: '설비 · 금속 · 기타',
    title: '급배수 배관 신설·누수 탐지 및 금속 가벽·강화도어 시공',
    subtitle: '노후 급배수관 교체부터 철제 프레임·트렌치·잡철 구조물 정밀 제작까지',
    photos: [
      {
        id: 'pm-photo-1',
        url: plumbingMetalImg,
        subtitle: '상업용 주방·카페 급배수 매니폴드 배관 신설 및 갈바륨 금속 가벽 골조',
        specNote: 'KS 규격 PB 급수관 및 VG1 고강도 배수관 · 수압 테스트 게이지 검수',
      },
      {
        id: 'pm-photo-2',
        url: demolitionImg,
        subtitle: '바닥 배수 트렌치 매립 토공 및 방수 몰탈 되메우기 정밀 설비 공정',
        specNote: '구배 불량 역류 방지 설계 · 영업장 보건/위생 시설 기준 충족',
      },
    ],
    bulletPoints: [
      '카페·식당·의원 등 상업 공간 맞춤형 급수(PB/에이콘)·배수(VG1) 배관 및 트렌치 매립',
      '갈바륨·스테인리스 절곡 프레임, 철제 가벽, 강화도어 플로어힌지 당일 정밀 시공',
      '시공 직후 수압·배수 통수 시험 동영상 촬영 및 고객 알림톡 즉시 전송',
    ],
    duration: '평균 1~3일 소요',
    unitPriceLabel: '평당 18만 원~ (단독 공정 65만 원~)',
    basePricePerPyeong: 18,
    minFlatCost: 65,
    warrantyNote: '배관 누수·금속 처짐 1년 무상 A/S',
    pumsem: {
      chapterCode: '건설공사 표준품셈 기계설비부문 제1장(배관공사) · 건축부문 제7장(금속공사)',
      basisDescription: '옥내 급배수관 부설(배관공 0.15품/m), 경량 철골/갈바 프레임 제작·설치(철공 0.22품/㎡) 및 부속류 할증 5% 적용',
      skilledLaborPer10Pyeong: 2.3,
      generalLaborPer10Pyeong: 1.4,
      materialAllowancePct: 5,
      equipmentAndToolNote: '수압 시험기, 파이프 머신 및 TIG/아크 용접기 공구손료 반영',
    },
  },
];

export const SAMPLE_PHOTO_PRESETS: SamplePhotoPreset[] = [
  {
    id: 'preset-demolition',
    label: '상가 원상복구·바닥철거 현장 (25평)',
    category: 'demolition',
    defaultPyeong: 25,
    image: demolitionImg,
    pumsemAppliedCode: '표준품셈 건축 제18장 (철거·해체) 및 폐기물 중량 환산 기준',
    detectedIssues: [
      '경량 칸막이 가벽 약 14m 및 천장 텍스 해체 필요',
      '바닥 데코타일 제거 및 본드 제거 샌딩 (25평)',
      '주방 방수턱(조적/몰탈) 파쇄 및 급배수 배관 캡핑 마감',
    ],
    recommendedScope: [
      '가벽·천장 구조물 전면 해체 및 마대 작업 (보통인부 품 적용)',
      '바닥 연삭 샌딩기 투입 (특별인부 + 집진 연삭 기계경비)',
      '2.5톤 폐기물 차량 2대 적법 반출 (올바로 시스템 정량 등록)',
    ],
    wasteTons: '약 4.2톤 (2.5톤 차량 2대)',
    manDays: 6,
  },
  {
    id: 'preset-bathroom',
    label: '화장실 성능개선·방수 리모델링 (4평)',
    category: 'bathroom',
    defaultPyeong: 4,
    image: bathroomImg,
    pumsemAppliedCode: '표준품셈 건축 제9장(방수)·제10장(타일)·기계설비 제3장(위생기구)',
    detectedIssues: [
      '기존 바닥 타일 백화 현상 및 배수구 주변 물고임 감지',
      '하부 방수층 노후화로 인한 3차 복합 도막방수 재시공 요망',
      '양변기·세면기 배수 트랩 악취 역류 구조 확인',
    ],
    recommendedScope: [
      '기존 타일 올철거 후 방수 몰탈 + 우레탄 3차 방수 (방수공 표준 품수)',
      '스테인리스 유가/트렌치 신설 및 정밀 물매(구배) 조성 (설비공 품수)',
      '600×600 포세린 논슬립 타일 압착시공 (타일공 품수 + 자재 할증 3%)',
    ],
    wasteTons: '약 0.9톤 (마대 폐기물 35자루)',
    manDays: 5,
  },
  {
    id: 'preset-deck',
    label: '테라스 합성목재 데크 리모델링 (15평)',
    category: 'deck',
    defaultPyeong: 15,
    image: deckImg,
    pumsemAppliedCode: '표준품셈 건축 제6장(합성목재 데크 틀·바닥판) 및 제7장(철골 하지)',
    detectedIssues: [
      '기존 방부목 부식·갈라짐 및 하지 각관 부식 확인',
      '우천 시 하부 배수 공간 확보를 위한 앙카 하지 보강 필요',
      '보행 안전용 25T 솔리드 합성목재 및 클립 시공 적합',
    ],
    recommendedScope: [
      '기존 노후 목재 철거 및 폐목재 반출',
      'KS 아연도금 각관(50×50) 400mm 간격 하지 골조 용접 (철골·용접공 품)',
      '국산 25T 고밀도 합성목재 클립 정밀 시공 (목공 품 + 할증 5%)',
    ],
    wasteTons: '약 1.4톤 (1톤 차량 1.5대)',
    manDays: 4,
  },
  {
    id: 'preset-waterproofing',
    label: '옥상 우레탄 3중 방수·크랙보수 (35평)',
    category: 'waterproofing',
    defaultPyeong: 35,
    image: waterproofingImg,
    pumsemAppliedCode: '표준품셈 건축 제9장 (폴리우레탄 도막방수 3.0mm 표준 일위대가)',
    detectedIssues: [
      '기존 우레탄 도막 들뜸(약 28%) 및 파라펫 코너부 균열 확인',
      '바탕면 함수율 과다로 인한 탈기반(에어벤트) 3개소 설치 필요',
      'KS 정품 우레탄 하도·중도(3mm)·상도 코팅 표준 공정 권장',
    ],
    recommendedScope: [
      '옥상 전면 다이아몬드 그라인더 연삭 및 고압 세척',
      '크랙 V-커팅 우레탄 실란트 충진 및 코너 부직포 보강',
      '하도 프라이머 + 중도 우레탄 3mm + 상도 탑코팅 (방수공 표준 품 적용)',
    ],
    wasteTons: '약 0.6톤 (박리 폐도막 수거)',
    manDays: 5,
  },
];

export const VERIFIED_CASE_STUDIES = [
  {
    id: 'case-1',
    category: '철거 · 원상복구 · 32평',
    title: '강남구 역삼동 *** 프랜차이즈 식당 퇴거 원상복구',
    client: '김** 대표 · 역삼 0000 직영점 운영',
    metrics: '표준품셈 산출 견적 440만 원 · 현장 추가금 0원 · 2일 만에 관리단 검수 1회 통과',
    outcome:
      '타 업체에서 주방 트렌치 파쇄 비용을 현장에서 180만 원 추가 요구해 공사를 중단하고 정석공사에 의뢰했습니다. 건설공사 표준품셈 기준 AI 견적과 실측 내역서가 100% 동일했고 건물 관리소 검수까지 한 번에 끝났습니다.',
  },
  {
    id: 'case-2',
    category: '화장실 성능개선 · 남녀 구분 6평',
    title: '마포구 서교동 *** 사옥 노후 화장실 방수·악취 개선 리모델링',
    client: '박** 실장 · 서교동 **** 스튜디오 자산관리',
    metrics: '3차 우레탄 도막방수 · 배수 구배 재설계 · 시공 후 1년간 누수·악취 0건',
    outcome:
      '비만 오면 아래층 천장으로 누수가 발생하고 배수구 악취가 심했던 화장실이었습니다. 매일 공정별 방수 도막 두께와 담수 테스트 사진을 알림톡으로 보내주셔서 현장에 가지 않고도 완벽히 검수했습니다.',
  },
  {
    id: 'case-3',
    category: '데크시공 · 루프탑 테라스 22평',
    title: '성동구 성수동 *** 복합문화공간 루프탑 합성목재 데크 리모델링',
    client: '이** 소장 · 성수 **** 라운지 시설팀',
    metrics: '아연도금 각관 400mm 정석 하지 · 25T 국산 합성목재 · 시공 기간 3일 단축',
    outcome:
      '장선 간격을 넓혀 단가를 낮추는 관행 대신 표준품셈 기준 400mm 정석 간격과 투입 자재 할증 수량을 계약서에 명시해 주셨습니다. 완공 8개월 차 사계절을 지났는데도 뒤틀림 하나 없이 견고합니다.',
  },
];
