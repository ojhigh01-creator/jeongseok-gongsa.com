export type MemberTier = 'regular' | 'paid_member'; // 일반회원 | 1,000원 유료회원

export interface MemberProfile {
  id: string; // 회원 고유 ID (전화번호 기준 or UUID)
  phone: string; // 예: 010-1234-5678
  name: string; // 이름
  tier: MemberTier;
  ticketBalance: number; // 보유 중인 AI 견적 이용권 수량 (건수)
  totalTicketsPurchased: number;
  totalSavedEstimates: number;
  totalOrdersCount: number;
  joinedAt: number; // 가입일시 (밀리초)
  lastLoginAt: number;
}

export type TicketStatus = 'active' | 'used' | 'refunded';

export interface EstimateTicket {
  ticketId: string; // 고유 티켓 ID (예: TKT-20261018-XXXX)
  token: string; // 서버 검증용 암호화/해시 토큰
  userId: string;
  userPhone: string;
  userName: string;
  amount: number; // 1,000원
  status: TicketStatus;
  paymentMethod: 'card' | 'kakaopay' | 'tosspay' | 'vbank';
  paymentOrderId: string;
  createdAt: number;
  usedAt?: number;
  usedCategory?: string;
  usedPyeong?: number;
}

export interface SupplyOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number; // 적용된 단가 (회원가 또는 일반가)
  regularPrice: number;
  totalPrice: number;
}

export type OrderStatus = 'payment_completed' | 'preparing' | 'shipped' | 'delivered';

export interface SupplyOrder {
  orderId: string; // 예: ORD-20261018-XXXX
  userId: string;
  userName: string;
  userPhone: string;
  deliveryAddress: string;
  detailAddress: string;
  deliveryMemo?: string;
  items: SupplyOrderItem[];
  totalItemAmount: number; // 정가 기준
  memberDiscountAmount: number; // 유료회원 할인 총액
  finalAmount: number; // 실제 결제액 (원)
  paymentMethod: 'card' | 'kakaopay' | 'tosspay' | 'vbank';
  status: OrderStatus;
  createdAt: number;
  shippedAt?: number;
}

export interface StoredEstimate {
  id: string;
  userId: string;
  category: string;
  categoryLabel: string;
  pyeong: number;
  floor: string;
  hasElevator: boolean;
  ticketId: string;
  totalEstimateMin: number;
  totalEstimateMax: number;
  supplyPriceMin: number;
  supplyPriceMax: number;
  vatMin: number;
  vatMax: number;
  damageSeverity: string;
  createdAt: number;
  analysisSummary: string;
  rawAnalysisData: any;
  rawCalculationReport: any;
}
