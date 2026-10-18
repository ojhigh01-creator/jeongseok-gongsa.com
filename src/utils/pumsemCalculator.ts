export type ServiceCategoryKey =
  | 'all'
  | 'demolition'
  | 'waterproofing'
  | 'interior'
  | 'bathroom'
  | 'deck'
  | 'plumbing_metal';

export type PricingSourceType =
  | '공식 표준품셈 기준'
  | '정석공사 자체 산정단가 (대한건설협회 시중노임 기준 절충)'
  | '정석공사 자체 산정단가'
  | '자체 산정 경비 (품셈 공구손료 준용)'
  | '현장 실측 후 확정';

export interface PumsemLaborDetail {
  skilledLaborManDays: number;
  skilledLaborWagePerDay: number;
  skilledLaborCost: number;
  generalLaborManDays: number;
  generalLaborWagePerDay: number;
  generalLaborCost: number;
  totalLaborCost: number;
}

export interface PumsemMaterialDetail {
  baseMaterialCost: number;
  allowancePercent: number;
  allowanceAmount: number;
  totalMaterialCost: number;
}

export interface PumsemEquipmentDetail {
  toolFee: number;
  machineryCost: number;
  totalEquipmentCost: number;
}

export interface PumsemWasteDetail {
  estimatedTons: number;
  costPerTon: number;
  handlingCost: number;
  ladderTruckCost: number;
  totalWasteCost: number;
}

export interface ItemizedCostItem {
  name: string;
  sourceType: PricingSourceType;
  basis: string;
  quantity: string;
  unitPrice: string;
  amount: number;
}

export interface PumsemCalculationResult {
  category: ServiceCategoryKey;
  categoryLabel: string;
  pyeong: number;
  squareMeters: number;
  floor: string;
  hasElevator: boolean;
  labor: PumsemLaborDetail;
  material: PumsemMaterialDetail;
  equipment: PumsemEquipmentDetail;
  waste: PumsemWasteDetail;
  subtotal: number;
  vat: number;
  totalWithVat: number;
  priceRangeBasis: string;
  priceRangeWithVatBasis: string;
  priceRangeMin: number;
  priceRangeMax: number;
  priceRangeWithVatMin: number;
  priceRangeWithVatMax: number;
  itemizedItems: ItemizedCostItem[];
  pumsemStandardChapter: string;
  pumsemStandardBasis: string;
}

// 2026년 정석공사 적용 기준 단가 및 출처 명시
export const WAGE_RATES_2026 = {
  /**
   * 특별인부/전문기능공 일급: 264,000원 (1일 8시간 기준, VAT 별도)
   * [출처 및 성격]: 정석공사 자체 산정 실행단가.
   * 대한건설협회 2026년 상반기 공표 특별인부(226,122원), 방수공(226,204원), 타일공(286,589원) 등
   * 복합 공종별 기능공 시장 임금을 정석공사 직영 기준으로 절충·산정한 자체 기준단가입니다.
   */
  skilledLaborDaily: 264000,

  /**
   * 보통인부 일급: 165,000원 (1일 8시간 기준, VAT 별도)
   * [출처 및 성격]: 정석공사 자체 산정 실행단가.
   * 대한건설협회 2026년 상반기 공표 보통인부 시중노임단가(172,068원) 대비
   * 정석공사 현장 직영 해체·정리 보조인력 적용 자체 기준단가입니다.
   */
  generalLaborDaily: 165000,

  /**
   * 건설폐기물 처리비: 350,000원 / 톤 (VAT 별도)
   * [출처 및 성격]: 정석공사 자체 설정단가.
   * 수도권 건설폐기물 수집·운반 및 중간처리장 반입, 환경부 올바로 시스템 등록 실거래가 기반입니다.
   */
  wasteCostPerTon: 350000,

  /**
   * 사다리차 양중비: 200,000원 / 회 (VAT 별도)
   * [출처 및 성격]: 정석공사 자체 설정단가.
   * 2층 이상 또는 지하층 현장 중 엘리베이터가 없는 현장에 한해 사다리차 실비로 가산됩니다.
   */
  ladderTruckBaseCost: 200000,
};

export interface ServicePumsemSpec {
  categoryLabel: string;
  basePricePerPyeong: number; // 만원 단위 (정석공사 직영 자재/시공 기준가)
  minFlatCost: number; // 만원 단위 (최소 출동 보장 기준)
  chapterCode: string;
  basisDescription: string;
  skilledLaborPer10Pyeong: number;
  generalLaborPer10Pyeong: number;
  materialAllowancePct: number;
  equipmentAndToolNote: string;
  tonsPerPyeong: number;
}

export const PUMSEM_SERVICE_SPECS: Record<string, ServicePumsemSpec> = {
  demolition: {
    categoryLabel: '철거 · 원상복구',
    basePricePerPyeong: 12,
    minFlatCost: 85,
    chapterCode: '건설공사 표준품셈 건축부문 제18장 (철거 및 해체공사)',
    basisDescription: '내장재·칸막이 해체(㎡당 보통인부 0.08품) 및 바닥 모르타르/타일 파쇄·연마 품셈 적용',
    skilledLaborPer10Pyeong: 1.4,
    generalLaborPer10Pyeong: 2.2,
    materialAllowancePct: 3,
    equipmentAndToolNote: '공구손료(노무비의 3%) 및 소형 브레이커·집진 연삭기 기계경비 반영',
    tonsPerPyeong: 0.18,
  },
  waterproofing: {
    categoryLabel: '방수 · 외벽보수',
    basePricePerPyeong: 15,
    minFlatCost: 95,
    chapterCode: '건설공사 표준품셈 건축부문 제9장 (방수공사 - 폴리우레탄 고무계 도막방수)',
    basisDescription: '바탕면 정리 후 우레탄 도막방수 두께 3.0mm 기준(㎡당 방수공 0.16품 + 보통인부 0.07품) 및 자재 할증 3% 적용',
    skilledLaborPer10Pyeong: 2.1,
    generalLaborPer10Pyeong: 1.3,
    materialAllowancePct: 3,
    equipmentAndToolNote: '바탕 연삭기, 고압세척기 및 교반기(믹서) 공구손료 반영',
    tonsPerPyeong: 0.05,
  },
  interior: {
    categoryLabel: '인테리어 · 리모델링',
    basePricePerPyeong: 68,
    minFlatCost: 220,
    chapterCode: '건설공사 표준품셈 건축부문 제8장(미장-자동수평몰탈) · 제10장(타일) · 제13장(도장공사)',
    basisDescription: '수평몰탈 바름(미장공 0.09품/㎡), 바닥 타일 붙임(타일공 0.18품/㎡), 수성페인트 2회 롤러/뿜칠 품셈 합산 적용',
    skilledLaborPer10Pyeong: 4.6,
    generalLaborPer10Pyeong: 2.5,
    materialAllowancePct: 4,
    equipmentAndToolNote: '에어리스 도장기, 레이저 레벨기 및 몰탈 교반 펌프 장비비 반영',
    tonsPerPyeong: 0.12,
  },
  bathroom: {
    categoryLabel: '인테리어 · 화장실 성능개선 (특화)',
    basePricePerPyeong: 85,
    minFlatCost: 180,
    chapterCode: '건설공사 표준품셈 건축부문 제9장(방수) · 제10장(타일) · 기계설비 제3장(위생기구)',
    basisDescription: '도막방수 3회 칠(㎡당 방수공 0.14품), 자기질 대형 타일 압착붙임(타일공 0.21품) 및 타일 할증 3% 적용',
    skilledLaborPer10Pyeong: 5.8,
    generalLaborPer10Pyeong: 3.1,
    materialAllowancePct: 3,
    equipmentAndToolNote: '타일 커팅·레이저 레벨링 장비 및 급배수 수압 시험기 계측 품셈 반영',
    tonsPerPyeong: 0.22,
  },
  deck: {
    categoryLabel: '인테리어 · 데크시공 리모델링 (특화)',
    basePricePerPyeong: 42,
    minFlatCost: 110,
    chapterCode: '건설공사 표준품셈 건축부문 제6장(목공사-합성목재 데크) · 제7장(금속공사-경량철골 하지)',
    basisDescription: '철골 각관 틀 제작·설치(철골공+용접공 품) 및 합성목재 바닥판 클립 고정(목공 0.19품/㎡), 목재 할증 5% 적용',
    skilledLaborPer10Pyeong: 3.9,
    generalLaborPer10Pyeong: 2.0,
    materialAllowancePct: 5,
    equipmentAndToolNote: '용접기 경비, 절단석 소모품 및 방청 도료 부자재 표준품셈 일위대가 반영',
    tonsPerPyeong: 0.08,
  },
  plumbing_metal: {
    categoryLabel: '설비 · 금속 · 기타',
    basePricePerPyeong: 18,
    minFlatCost: 65,
    chapterCode: '건설공사 표준품셈 기계설비부문 제1장(배관공사) · 건축부문 제7장(금속공사)',
    basisDescription: '옥내 급배수관 부설(배관공 0.15품/m), 경량 철골/갈바 프레임 제작·설치(철공 0.22품/㎡) 및 부속류 할증 5% 적용',
    skilledLaborPer10Pyeong: 2.3,
    generalLaborPer10Pyeong: 1.4,
    materialAllowancePct: 5,
    equipmentAndToolNote: '수압 시험기, 파이프 머신 및 TIG/아크 용접기 공구손료 반영',
    tonsPerPyeong: 0.10,
  },
};

export function calculatePumsemEstimate(params: {
  category: ServiceCategoryKey | string;
  pyeong: number;
  floor?: string;
  hasElevator?: boolean;
  damageSeverity?: 'light' | 'moderate' | 'severe' | '경미' | '보통' | '심각' | string;
}): PumsemCalculationResult {
  const { category = 'demolition', pyeong: rawPyeong, floor = '1층', hasElevator = true, damageSeverity = '보통' } = params;

  // 0원, 음수, NaN 입력 방어: 최소 1평 ~ 최대 500평 제한
  const parsedPyeong = Number(rawPyeong);
  const pyeong = Math.max(1, Math.min(500, isNaN(parsedPyeong) || parsedPyeong <= 0 ? 1 : parsedPyeong));
  const squareMeters = Number((pyeong * 3.305785).toFixed(1));

  const spec = PUMSEM_SERVICE_SPECS[category] || PUMSEM_SERVICE_SPECS['demolition'];
  const scaleFactor = pyeong / 10;

  // 손상도 및 작업 난이도 보정 계수
  let severityMultiplier = 1.0;
  if (damageSeverity === 'severe' || damageSeverity === '심각') {
    severityMultiplier = 1.15;
  } else if (damageSeverity === 'light' || damageSeverity === '경미') {
    severityMultiplier = 0.92;
  }

  // 1. 노무비 계산 (품수는 소수 첫째자리 반올림, 금액은 원 단위 반올림)
  const skilledDays = Number(
    (spec.skilledLaborPer10Pyeong * scaleFactor * severityMultiplier).toFixed(1)
  );
  const generalDays = Number(
    (spec.generalLaborPer10Pyeong * scaleFactor * severityMultiplier).toFixed(1)
  );

  const skilledLaborCost = Math.round(skilledDays * WAGE_RATES_2026.skilledLaborDaily);
  const generalLaborCost = Math.round(generalDays * WAGE_RATES_2026.generalLaborDaily);
  const totalLaborCost = skilledLaborCost + generalLaborCost;

  // 2. 재료비 계산 (자체 설정 기준 자재비 + 표준품셈 자재 할증률)
  const rawMaterialUnitCost = Math.round(spec.basePricePerPyeong * 10000 * 0.42);
  const baseMaterialCost = Math.round(rawMaterialUnitCost * pyeong);
  const allowancePercent = spec.materialAllowancePct || 3;
  const allowanceAmount = Math.round(baseMaterialCost * (allowancePercent / 100));
  const totalMaterialCost = baseMaterialCost + allowanceAmount;

  // 3. 공구손료 및 경장비비 (공구손료는 노무비의 3% 품셈 준용)
  const toolFee = Math.round(totalLaborCost * 0.03);
  const machineryCost = Math.round(Math.min(1500000, Math.max(80000, pyeong * 18000)));
  const totalEquipmentCost = toolFee + machineryCost;

  // 4. 폐기물 처리 및 운반비 (톤수는 소수 첫째자리 반올림)
  const estimatedTons = Number(Math.max(0.5, pyeong * spec.tonsPerPyeong * severityMultiplier).toFixed(1));
  const costPerTon = WAGE_RATES_2026.wasteCostPerTon;
  const handlingCost = Math.round(estimatedTons * costPerTon);

  const isHighFloor = floor.includes('2층') || floor.includes('3층') || floor.includes('4층') || floor.includes('5층') || floor.includes('지하');
  const ladderTruckCost = (!hasElevator && isHighFloor) ? WAGE_RATES_2026.ladderTruckBaseCost : 0;
  const totalWasteCost = handlingCost + ladderTruckCost;

  // 5. 합계 및 범위 산출
  const calculatedSum = totalLaborCost + totalMaterialCost + totalEquipmentCost + totalWasteCost;
  const minGuaranteedCost = (spec.minFlatCost || 80) * 10000;
  const subtotal = Math.max(minGuaranteedCost, calculatedSum);

  // 부가가치세 10% (원 단위 반올림)
  const vat = Math.round(subtotal * 0.1);
  const totalWithVat = subtotal + vat;

  // 예상 견적 범위: 만원 단위 반올림(Math.round) 규칙으로 100% 통일
  // 1) 공급가액 기준 (VAT 별도)
  const priceRangeMin = Math.round((subtotal * 0.95) / 10000) * 10000;
  const priceRangeMax = Math.round((subtotal * 1.10) / 10000) * 10000;

  // 2) 부가가치세 10% 포함 기준 독립 산출
  const priceRangeWithVatMin = Math.round((totalWithVat * 0.95) / 10000) * 10000;
  const priceRangeWithVatMax = Math.round((totalWithVat * 1.10) / 10000) * 10000;

  // 투명한 산출 내역서 항목 구성 (단가 출처 및 성격 엄격 구분)
  const itemizedItems: ItemizedCostItem[] = [
    {
      name: '직접 노무비 (특별인부/기능공)',
      sourceType: '정석공사 자체 산정단가 (대한건설협회 시중노임 기준 절충)',
      basis: `자체 기능공 실행단가(1일 264,000원) · ${skilledDays}품 (대한건설협회 2026 상반기 공표 특별인부 226,122원/타일 286,589원/방수 226,204원 절충)`,
      quantity: `${skilledDays}인·일`,
      unitPrice: `${WAGE_RATES_2026.skilledLaborDaily.toLocaleString('ko-KR')}원`,
      amount: skilledLaborCost,
    },
    {
      name: '직접 노무비 (보통인부)',
      sourceType: '정석공사 자체 산정단가 (대한건설협회 시중노임 기준 절충)',
      basis: `자체 보조인력 실행단가(1일 165,000원) · ${generalDays}품 (대한건설협회 2026 상반기 공표 보통인부 172,068원 대비 절충)`,
      quantity: `${generalDays}인·일`,
      unitPrice: `${WAGE_RATES_2026.generalLaborDaily.toLocaleString('ko-KR')}원`,
      amount: generalLaborCost,
    },
    {
      name: 'KS 정품 자재비',
      sourceType: '정석공사 자체 산정단가',
      basis: `${spec.categoryLabel} 표준 배합 및 유통 실거래가 기반 정석공사 직영 기준 자재비`,
      quantity: `${pyeong}평 (${squareMeters}㎡)`,
      unitPrice: `${Math.round(rawMaterialUnitCost).toLocaleString('ko-KR')}원/평`,
      amount: baseMaterialCost,
    },
    {
      name: '표준 자재 할증료',
      sourceType: '공식 표준품셈 기준',
      basis: `국토교통부 건설공사 표준품셈 제1장 적용기준 재료 할증률 규정 (${allowancePercent}% 적용)`,
      quantity: '일식',
      unitPrice: `${allowancePercent}%`,
      amount: allowanceAmount,
    },
    {
      name: '기계경비 및 공구손료',
      sourceType: '자체 산정 경비 (품셈 공구손료 준용)',
      basis: `품셈 공통공사 공구손료 준용(노무비 3%: ${toolFee.toLocaleString()}원) + 소형 장비 실경비(${machineryCost.toLocaleString()}원)`,
      quantity: '일식',
      unitPrice: '품셈 일위대가',
      amount: totalEquipmentCost,
    },
    {
      name: '건설폐기물 반출·처리비',
      sourceType: '정석공사 자체 산정단가',
      basis: `수도권 건설폐기물 수집·운반 및 올바로 적법 처리 실거래가 (추정 약 ${estimatedTons}톤)`,
      quantity: `${estimatedTons}톤`,
      unitPrice: `${costPerTon.toLocaleString('ko-KR')}원/톤`,
      amount: handlingCost,
    },
  ];

  if (ladderTruckCost > 0) {
    itemizedItems.push({
      name: '양중·사다리차 장비비',
      sourceType: '정석공사 자체 산정단가',
      basis: `${floor} (사다리차 운임 실거래가 기반 엘리베이터 부재 현장 양중 할증)`,
      quantity: '1회',
      unitPrice: `${ladderTruckCost.toLocaleString('ko-KR')}원`,
      amount: ladderTruckCost,
    });
  }

  // 최소 출동 보장액이 직접 합계보다 큰 경우 보정 내역 추가하여 원 단위 100% 일치 보장
  if (minGuaranteedCost > calculatedSum) {
    const diff = minGuaranteedCost - calculatedSum;
    itemizedItems.push({
      name: '기본 출동 보장 최소 공사비 조정',
      sourceType: '정석공사 자체 산정단가',
      basis: `소규모 현장 최저 기본 출동비 (${(spec.minFlatCost || 80)}만 원 보장 규정)`,
      quantity: '일식',
      unitPrice: '보장 차액',
      amount: diff,
    });
  }

  return {
    category: category as ServiceCategoryKey,
    categoryLabel: spec.categoryLabel,
    pyeong,
    squareMeters,
    floor,
    hasElevator,
    labor: {
      skilledLaborManDays: skilledDays,
      skilledLaborWagePerDay: WAGE_RATES_2026.skilledLaborDaily,
      skilledLaborCost,
      generalLaborManDays: generalDays,
      generalLaborWagePerDay: WAGE_RATES_2026.generalLaborDaily,
      generalLaborCost,
      totalLaborCost,
    },
    material: {
      baseMaterialCost,
      allowancePercent,
      allowanceAmount,
      totalMaterialCost,
    },
    equipment: {
      toolFee,
      machineryCost,
      totalEquipmentCost,
    },
    waste: {
      estimatedTons,
      costPerTon,
      handlingCost,
      ladderTruckCost,
      totalWasteCost,
    },
    subtotal,
    vat,
    totalWithVat,
    priceRangeBasis: '공급가액 기준 (VAT 별도, 만원 단위 반올림)',
    priceRangeWithVatBasis: '부가가치세 10% 포함 기준 (만원 단위 반올림)',
    priceRangeMin,
    priceRangeMax,
    priceRangeWithVatMin,
    priceRangeWithVatMax,
    itemizedItems,
    pumsemStandardChapter: spec.chapterCode,
    pumsemStandardBasis: spec.basisDescription,
  };
}
