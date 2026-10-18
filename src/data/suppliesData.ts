export interface SupplyProduct {
  id: string;
  name: string;
  category: 'waterproofing' | 'plumbing' | 'interior' | 'bathroom';
  categoryLabel: string;
  regularPrice: number; // 일반가 (원)
  memberPrice: number; // 1,000원 유료회원 할인가 (원)
  discountPct: number; // 할인율 (%)
  capacity: string; // 용량/규격
  summary: string;
  description: string;
  features: string[];
  engineerTip: string; // 정석공사 현장 마스터의 시공 팁
  recommendedFor: string[];
  inStock: boolean;
  imageUrl: string;
}

export const SUPPLIES_DATA: SupplyProduct[] = [
  {
    id: 'supply-wp-01',
    name: '정석 특수 우레탄 침투 방수 스프레이',
    category: 'waterproofing',
    categoryLabel: '누수·방수 관리',
    regularPrice: 16000,
    memberPrice: 12000,
    discountPct: 25,
    capacity: '500ml (약 2~3㎡ 시공 가능)',
    summary: '옥상 미세 균열 및 창틀 빗물 침투를 즉각 차단하는 초속경 침투 방수액',
    description:
      '건우 정석공사 방수팀이 외벽 및 옥상 보수 시 현장에서 직접 사용하는 침투형 투명 우레탄 방수제입니다. 분사 즉시 미세 크랙 깊숙이 침투하여 탄성 방수막을 형성합니다.',
    features: [
      '투명 무황변 탄성 도막 형성으로 기존 마감재 색상 보존',
      '빗물, 결로, 외벽 균열 긴급 실링에 탁월한 방수 성능',
      '스프레이 방식으로 초보자도 5분 만에 간편 시공 가능',
    ],
    engineerTip:
      '도포 전 먼지와 수분을 완전히 건조시킨 후 1차 도포하고, 30분 뒤 2차 덧칠하면 방수 수명이 2배 이상 지속됩니다.',
    recommendedFor: ['베란다 창틀 빗물 누수', '옥상 바닥 실크랙', '외벽 적벽돌 메지 틈새'],
    inStock: true,
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'supply-bt-02',
    name: '전문가용 바이오 항균 실리콘 & 전용 코킹건 세트',
    category: 'bathroom',
    categoryLabel: '욕실·위생 관리',
    regularPrice: 18000,
    memberPrice: 13500,
    discountPct: 25,
    capacity: '바이오 실리콘 300ml x 2개 + 고급형 압출건 + 스크래퍼 헤라 3종',
    summary: '욕실 물때와 흑곰팡이를 원천 차단하는 최고급 무초산 항균 바이오 실리콘 세트',
    description:
      '습기가 많은 욕실 욕조 주변, 싱크대 테두리, 세면대 이음매 전용 100% 바이오 방미 실리콘입니다. 정밀 압출건과 전문가용 각도 헤라가 동봉되어 누구나 깔끔한 실링 라인을 완성할 수 있습니다.',
    features: [
      '곰팡이 억제 항균제 함유로 5년 이상 흑곰팡이 번식 억제',
      '냄새가 거의 없는 친환경 무초산 타입',
      '코킹 초보자를 위한 3가지 각도 실리콘 헤라 무료 동봉',
    ],
    engineerTip:
      '기존 실리콘을 스크래퍼로 100% 제거한 뒤 물기를 마른 수건으로 닦고 헤어드라이어로 건조 후 시공해야 들뜸이 없습니다.',
    recommendedFor: ['욕조 및 세면대 실리콘 곰팡이', '싱크대 상판 틈새 물샘', '샤워부스 유리 접합부'],
    inStock: true,
    imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'supply-pl-03',
    name: '고점도 배관 고압 슬러지 용해 세정제 (1L x 2개)',
    category: 'plumbing',
    categoryLabel: '배관·설비 관리',
    regularPrice: 24000,
    memberPrice: 18000,
    discountPct: 25,
    capacity: '1,000ml x 2개입 (총 2L 대용량)',
    summary: '싱크대 기름 슬러지와 머리카락을 분해하여 배수 속도를 되살리는 고농축 배관액',
    description:
      '식당 주방이나 노후 아파트 배관의 고질적인 악취와 막힘을 해결하는 산업용 레벨의 고점도 배관 세정제입니다. 배관 내벽에 흡착되어 기름때와 유기물 슬러지를 말끔히 녹여냅니다.',
    features: [
      '고점도 겔 타입으로 물속에서도 배관벽에 밀착 반응',
      'PVC 및 금속 배관 손상 없는 안전 포뮬러',
      '하수구 날파리 서식 억제 및 악취 유발균 99.9% 살균',
    ],
    engineerTip:
      '취침 전 싱크대나 배수구에 500ml를 붓고 밤새 반응시킨 후, 다음 날 아침 뜨거운 물을 5리터 가량 단번에 부어주면 가장 효과적입니다.',
    recommendedFor: ['주방 싱크대 물빠짐 둔화', '욕실 배수구 머리카락 막힘', '하수구 역류 악취'],
    inStock: true,
    imageUrl: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'supply-wp-04',
    name: '초강력 방수 부틸 고무 알루미늄 테이프',
    category: 'waterproofing',
    categoryLabel: '누수·방수 관리',
    regularPrice: 15000,
    memberPrice: 11000,
    discountPct: 26,
    capacity: '폭 10cm x 길이 5m (두께 1.5mm 초후물)',
    summary: '지붕 판넬 틈새, 빗물받이 홈통, 창호 실리콘 터짐 부위를 10초 만에 막는 방수 테이프',
    description:
      '순수 부틸 고무와 순알루미늄 방열 호일이 결합된 고접착 자착식 방수 테이프입니다. 영하 20도에서 영상 80도까지 경화되거나 흘러내리지 않고 반영구적 접착력을 유지합니다.',
    features: [
      '순알루미늄 표면 코팅으로 자외선 차단 및 내후성 10년 보장',
      '찢어지지 않는 고인장 알루미늄 그리드 매트릭스',
      '물기가 스며들 틈이 없는 고점도 부틸 점착층',
    ],
    engineerTip:
      '부착 후 손이나 롤러로 중심부에서 바깥쪽으로 강하게 문질러 내부 공기 방울을 완전히 빼주어야 접착력이 극대화됩니다.',
    recommendedFor: ['옥상 샌드위치 판넬 조인트', '베란다 물받이 홈통 균열', '창틀 외부 이음매'],
    inStock: true,
    imageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'supply-it-05',
    name: '전문가용 벽체 균열 보수 크랙 퍼티 세트',
    category: 'interior',
    categoryLabel: '인테리어 보수',
    regularPrice: 14000,
    memberPrice: 10500,
    discountPct: 25,
    capacity: '퍼티 500g + 스테인리스 헤라 1종 + 샌딩 사포 2종',
    summary: '실내 콘크리트 미세 크랙, 못자국, 석고보드 이음매를 매끄럽게 복원하는 속경 퍼티',
    description:
      '실내 벽지 교체 전 밑작업이나 페인트 시공 전 벽체 단차를 맞추는 최고급 수성 퍼티입니다. 수축율이 극히 적어 건조 후 갈라짐이 없으며, 동봉된 사포로 손쉽게 평탄면을 만들 수 있습니다.',
    features: [
      '초미립 입자로 매끄러운 평탄면 연출',
      '건조 후 수축률 1% 미만으로 2차 균열 방지',
      '도배 및 수성 페인트 마감 완벽 호환',
    ],
    engineerTip:
      '깊은 크랙은 퍼티를 2회에 걸쳐 나누어 채우고, 2시간 건조 후 #400 사포로 가볍게 원을 그리며 샌딩하면 전문 도장면과 동일해집니다.',
    recommendedFor: ['석고보드 가벽 이음새 균열', '벽면 못자국 및 앙카 홀 메꿈', '문틀 주변 단차 보수'],
    inStock: true,
    imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'supply-bt-06',
    name: '항균 에폭시 타일 줄눈 보수 코팅제 (250g)',
    category: 'bathroom',
    categoryLabel: '욕실·위생 관리',
    regularPrice: 20000,
    memberPrice: 15000,
    discountPct: 25,
    capacity: '250g (일반 30평대 아파트 욕실 1개소 전체 시공 분량)',
    summary: '타일 줄눈의 오염과 곰팡이를 덮고 방수 피막을 입히는 튜브형 에폭시 줄눈제',
    description:
      '누렇게 변색된 백시멘트 줄눈을 긁어내지 않고도 그 위에 덧발라 방수와 항균 피막을 입혀주는 간편 튜브형 줄눈 코팅제입니다. 물이 스며들지 않아 욕실 하부 방수층을 보호합니다.',
    features: [
      '물과 샴푸, 락스 청소에도 벗겨지지 않는 고경도 에폭시 피막',
      '미세 노즐 팁으로 줄눈 홈에 정확하게 충진',
      '황변 현상 방지 UV 차단 포뮬러',
    ],
    engineerTip:
      '줄눈에 약액을 채운 후 3~5분 뒤 물티슈나 젖은 스펀지로 타일에 묻은 잔여물을 닦아내면 줄눈 골에만 깔끔하게 남습니다.',
    recommendedFor: ['욕실 바닥 타일 찌든 때 줄눈', '현관 폴리싱 타일 메지 변색', '베란다 타일 방수 보강'],
    inStock: true,
    imageUrl: 'https://images.unsplash.com/photo-1584622781564-1d987f7333c1?w=800&auto=format&fit=crop&q=80',
  },
];
