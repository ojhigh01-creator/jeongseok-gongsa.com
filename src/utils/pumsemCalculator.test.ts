import { calculatePumsemEstimate } from './pumsemCalculator';

function runUnitTests() {
  console.log('====================================================');
  console.log('[정밀 단위 테스트] 표준품셈 계산 엔진 정밀 검증 시작');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assertEqual(actual: unknown, expected: unknown, label: string) {
    totalTests++;
    if (actual === expected) {
      console.log(`✓ [통과] ${label}: ${actual}`);
      passedTests++;
    } else {
      console.error(`✗ [실패] ${label}: 기대값 ${expected}, 실제값 ${actual}`);
      throw new Error(`Test failed for ${label}`);
    }
  }

  // TEST 1: 화장실 성능개선 리모델링 (4평, 1층, 엘리베이터 있음, 손상도 보통)
  console.log('--- TEST 1: 욕실 4평 (1층, 엘리베이터 있음, 손상도 보통) ---');
  const bathResult = calculatePumsemEstimate({
    category: 'bathroom',
    pyeong: 4,
    floor: '1층',
    hasElevator: true,
    damageSeverity: '보통',
  });

  assertEqual(bathResult.labor.skilledLaborManDays, 2.3, '욕실 특별인부 품수 (5.8 * 0.4)');
  assertEqual(bathResult.labor.skilledLaborCost, 607200, '욕실 특별인부 노무비 (2.3 * 264,000원)');
  assertEqual(bathResult.labor.generalLaborManDays, 1.2, '욕실 보통인부 품수 (3.1 * 0.4)');
  assertEqual(bathResult.labor.generalLaborCost, 198000, '욕실 보통인부 노무비 (1.2 * 165,000원)');
  assertEqual(bathResult.labor.totalLaborCost, 805200, '욕실 총 노무비');
  assertEqual(bathResult.material.baseMaterialCost, 1428000, '욕실 기준 자재비');
  assertEqual(bathResult.material.allowanceAmount, 42840, '욕실 자재 할증료 (3%)');
  assertEqual(bathResult.material.totalMaterialCost, 1470840, '욕실 총 재료비');
  assertEqual(bathResult.equipment.toolFee, 24156, '욕실 공구손료 (노무비의 3%)');
  assertEqual(bathResult.equipment.machineryCost, 80000, '욕실 소형 기계경비');
  assertEqual(bathResult.equipment.totalEquipmentCost, 104156, '욕실 총 장비경비');
  assertEqual(bathResult.waste.estimatedTons, 0.9, '욕실 폐기물 톤수 (4 * 0.22톤 반올림)');
  assertEqual(bathResult.waste.handlingCost, 315000, '욕실 폐기물 처리비 (0.9 * 350,000원)');
  assertEqual(bathResult.waste.ladderTruckCost, 0, '욕실 사다리차비 (1층이므로 0원)');
  assertEqual(bathResult.waste.totalWasteCost, 315000, '욕실 총 폐기물비');
  assertEqual(bathResult.subtotal, 2695196, '욕실 공급가액 소계');
  assertEqual(bathResult.vat, 269520, '욕실 부가가치세 (10%)');
  assertEqual(bathResult.totalWithVat, 2964716, '욕실 합계금액 (VAT 포함)');
  assertEqual(bathResult.priceRangeMin, 2560000, '욕실 최소 예상 견적 (95% 만원단위 반올림: 2,560,436.2원 -> 2,560,000원)');
  assertEqual(bathResult.priceRangeMax, 2960000, '욕실 최대 예상 견적 (110% 만원단위 반올림: 2,964,715.6원 -> 2,960,000원)');
  assertEqual(bathResult.priceRangeWithVatMin, 2820000, '욕실 부가세포함 최소 예상 견적 (95% 만원단위 반올림: 2,816,480.2원 -> 2,820,000원)');
  assertEqual(bathResult.priceRangeWithVatMax, 3260000, '욕실 부가세포함 최대 예상 견적 (110% 만원단위 반올림: 3,261,187.6원 -> 3,260,000원)');

  // 원 단위 일치 검증: 테이블 항목 합계와 subtotal 일치 여부
  const bathTableSum = bathResult.itemizedItems.reduce((acc, cur) => acc + cur.amount, 0);
  assertEqual(bathTableSum, bathResult.subtotal, '욕실 항목별 내역 금액 합계와 공급가액 1원 단위 완전 일치 (2,695,196원)');

  console.log('\n--- TEST 2: 철거 및 원상복구 (25평, 2층, 엘리베이터 없음, 손상도 보통) ---');
  const demoResult = calculatePumsemEstimate({
    category: 'demolition',
    pyeong: 25,
    floor: '2층',
    hasElevator: false,
    damageSeverity: '보통',
  });

  assertEqual(demoResult.labor.skilledLaborManDays, 3.5, '철거 특별인부 품수 (1.4 * 2.5)');
  assertEqual(demoResult.labor.skilledLaborCost, 924000, '철거 특별인부 노무비 (3.5 * 264,000원)');
  assertEqual(demoResult.labor.generalLaborManDays, 5.5, '철거 보통인부 품수 (2.2 * 2.5)');
  assertEqual(demoResult.labor.generalLaborCost, 907500, '철거 보통인부 노무비 (5.5 * 165,000원)');
  assertEqual(demoResult.labor.totalLaborCost, 1831500, '철거 총 노무비');
  assertEqual(demoResult.material.baseMaterialCost, 1260000, '철거 기준 자재비');
  assertEqual(demoResult.material.allowanceAmount, 37800, '철거 자재 할증료 (3%)');
  assertEqual(demoResult.material.totalMaterialCost, 1297800, '철거 총 재료비');
  assertEqual(demoResult.equipment.toolFee, 54945, '철거 공구손료 (노무비의 3%)');
  assertEqual(demoResult.equipment.machineryCost, 450000, '철거 집진 연삭 기계경비');
  assertEqual(demoResult.equipment.totalEquipmentCost, 504945, '철거 총 장비경비');
  assertEqual(demoResult.waste.estimatedTons, 4.5, '철거 폐기물 톤수 (25 * 0.18톤)');
  assertEqual(demoResult.waste.handlingCost, 1575000, '철거 폐기물 처리비 (4.5 * 350,000원)');
  assertEqual(demoResult.waste.ladderTruckCost, 200000, '철거 사다리차비 (2층 + 엘리베이터 없음)');
  assertEqual(demoResult.waste.totalWasteCost, 1775000, '철거 총 폐기물 및 양중비');
  assertEqual(demoResult.subtotal, 5409245, '철거 공급가액 소계');
  assertEqual(demoResult.vat, 540925, '철거 부가가치세 (10%)');
  assertEqual(demoResult.totalWithVat, 5950170, '철거 합계금액 (VAT 포함)');
  // 5,409,245 * 0.95 = 5,138,782.75원 -> 만원 단위 반올림(Math.round) = 5,140,000원
  assertEqual(demoResult.priceRangeMin, 5140000, '철거 최소 예상 견적 (95% 만원단위 반올림: 5,138,782.75원 -> 5,140,000원)');
  assertEqual(demoResult.priceRangeMax, 5950000, '철거 최대 예상 견적 (110% 만원단위 반올림: 5,950,169.5원 -> 5,950,000원)');
  assertEqual(demoResult.priceRangeWithVatMin, 5650000, '철거 부가세포함 최소 예상 견적 (95% 만원단위 반올림: 5,652,661.5원 -> 5,650,000원)');
  assertEqual(demoResult.priceRangeWithVatMax, 6550000, '철거 부가세포함 최대 예상 견적 (110% 만원단위 반올림: 6,545,187원 -> 6,550,000원)');

  const demoTableSum = demoResult.itemizedItems.reduce((acc, cur) => acc + cur.amount, 0);
  assertEqual(demoTableSum, demoResult.subtotal, '철거 항목별 내역 금액 합계와 공급가액 1원 단위 완전 일치 (5,409,245원)');

  console.log('\n--- TEST 3: 경계값, 0원 및 음수 입력, 소수점 평수, 최소 출동비 보정 검증 ---');

  // 3-1: 0평 및 음수 입력 방어 (최소 1평으로 보정)
  const zeroResult = calculatePumsemEstimate({ category: 'demolition', pyeong: 0 });
  assertEqual(zeroResult.pyeong, 1, '0평 입력 시 최소 1평 자동 보정');

  const negResult = calculatePumsemEstimate({ category: 'demolition', pyeong: -15 });
  assertEqual(negResult.pyeong, 1, '음수(-15평) 입력 시 최소 1평 자동 보정');

  // 3-2: 소수점 평수 (7.5평) 계산 및 1원 단위 합계 일치
  const decimalResult = calculatePumsemEstimate({ category: 'interior', pyeong: 7.5 });
  const decimalTableSum = decimalResult.itemizedItems.reduce((acc, cur) => acc + cur.amount, 0);
  assertEqual(decimalTableSum, decimalResult.subtotal, '소수점 평수(7.5평) 산출 시 항목 내역 합계와 공급가액 1원 단위 일치');

  // 3-3: 최소 출동 보장액(85만 원) 트리거 검증
  // 철거 1평은 순수 계산 금액이 약 25만 원 수준으로, 최소 출동비(85만 원) 하한선이 작동해야 함
  const minGuaranteeResult = calculatePumsemEstimate({ category: 'demolition', pyeong: 1 });
  assertEqual(minGuaranteeResult.subtotal, 850000, '1평 소규모 철거 시 최소 출동 보장액(85만 원) 적용');
  const minTableSum = minGuaranteeResult.itemizedItems.reduce((acc, cur) => acc + cur.amount, 0);
  assertEqual(minTableSum, 850000, '최소 출동 보장액 적용 시에도 항목별 내역 합계와 공급가액 1원 단위 완전 일치');

  // 3-4: 만원 단위 반올림(사사오입) 경계값 수학적 검증
  const roundTest5000 = Math.round(5135000 / 10000) * 10000;
  assertEqual(roundTest5000, 5140000, '5,135,000원은 5,140,000원으로 올림');

  const roundTest4999 = Math.round(5134999 / 10000) * 10000;
  assertEqual(roundTest4999, 5130000, '5,134,999원은 5,130,000원으로 내림');

  console.log('\n====================================================');
  console.log(`[검증 완료] 총 ${totalTests}개 검증 항목 중 ${passedTests}개 통과 (성공률 100%)`);
  console.log('====================================================');
}

runUnitTests();
