import React, { useState } from 'react';
import {
  X,
  ShoppingBag,
  Check,
  ShieldCheck,
  Truck,
  Sparkles,
  Info,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Phone,
} from 'lucide-react';
import { SUPPLIES_DATA, SupplyProduct } from '../data/suppliesData';
import { MemberProfile, SupplyOrder, SupplyOrderItem } from '../types/membership';
import { saveSupplyOrder } from '../utils/memberStorage';
import { DIRECT_PHONE } from '../data/constructionData';

interface SuppliesStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMember: MemberProfile | null;
  onOpenMemberModal: () => void;
}

export const SuppliesStoreModal: React.FC<SuppliesStoreModalProps> = ({
  isOpen,
  onClose,
  currentMember,
  onOpenMemberModal,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<SupplyProduct | null>(null);
  const [orderQuantity, setOrderQuantity] = useState<number>(1);

  // Checkout modal state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [recipientName, setRecipientName] = useState<string>(currentMember?.name || '');
  const [recipientPhone, setRecipientPhone] = useState<string>(currentMember?.phone || '');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [detailAddress, setDetailAddress] = useState<string>('');
  const [deliveryMemo, setDeliveryMemo] = useState<string>('배송 전 미리 연락 바랍니다.');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'kakaopay' | 'tosspay' | 'vbank'>('card');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [completedOrder, setCompletedOrder] = useState<SupplyOrder | null>(null);

  if (!isOpen) return null;

  const isPaidMember = currentMember?.tier === 'paid_member';

  const filteredProducts =
    selectedCategory === 'all'
      ? SUPPLIES_DATA
      : SUPPLIES_DATA.filter((p) => p.category === selectedCategory);

  const handleOpenOrder = (product: SupplyProduct) => {
    setSelectedProduct(product);
    setOrderQuantity(1);
    setRecipientName(currentMember?.name || '');
    setRecipientPhone(currentMember?.phone || '');
    setIsCheckoutOpen(true);
    setCompletedOrder(null);
  };

  const calculateTotal = () => {
    if (!selectedProduct) return { regularTotal: 0, finalTotal: 0, discount: 0 };
    const price = isPaidMember ? selectedProduct.memberPrice : selectedProduct.regularPrice;
    const regularTotal = selectedProduct.regularPrice * orderQuantity;
    const finalTotal = price * orderQuantity;
    const discount = regularTotal - finalTotal;
    return { regularTotal, finalTotal, discount };
  };

  const handleProcessOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (!recipientName.trim() || !recipientPhone.trim() || !deliveryAddress.trim()) {
      alert('받는 분 성함, 연락처, 배송지 주소를 모두 입력해 주세요.');
      return;
    }

    setIsSubmittingOrder(true);
    const { regularTotal, finalTotal, discount } = calculateTotal();

    const orderItem: SupplyOrderItem = {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      quantity: orderQuantity,
      unitPrice: isPaidMember ? selectedProduct.memberPrice : selectedProduct.regularPrice,
      regularPrice: selectedProduct.regularPrice,
      totalPrice: finalTotal,
    };

    const newOrder: SupplyOrder = {
      orderId: `ORD-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`,
      userId: currentMember?.id || `GUEST_${recipientPhone.replace(/[^0-9]/g, '')}`,
      userName: recipientName.trim(),
      userPhone: recipientPhone.trim(),
      deliveryAddress: deliveryAddress.trim(),
      detailAddress: detailAddress.trim(),
      deliveryMemo,
      items: [orderItem],
      totalItemAmount: regularTotal,
      memberDiscountAmount: discount,
      finalAmount: finalTotal,
      paymentMethod,
      status: 'payment_completed',
      createdAt: Date.now(),
    };

    try {
      // Send to server
      await fetch('/api/order/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder),
      });
    } catch {
      // offline fallback
    }

    await saveSupplyOrder(newOrder);
    setIsSubmittingOrder(false);
    setCompletedOrder(newOrder);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-md">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">건우 정석공사 생활관리용품 스토어</h2>
                <span className="px-2 py-0.5 text-xs font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded">
                  현장 마스터 엄선
                </span>
              </div>
              <p className="text-xs text-slate-300">
                실제 시공 현장에서 검증된 고성능 방수·배관·욕실·인테리어 셀프 보수 자재 직영 공급
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Membership Banner */}
        <div className="bg-amber-50 px-6 py-2.5 border-b border-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 text-amber-900 font-medium">
            <Sparkles className="w-4 h-4 text-orange-600 shrink-0" />
            {isPaidMember ? (
              <span>
                <strong>{currentMember?.name}</strong>님은 <strong>1,000원 유료회원</strong>입니다! 전 품목 <strong>최대 26% 회원 할인가</strong>가 자동 적용됩니다.
              </span>
            ) : (
              <span>
                <strong>1,000원 AI 견적 유료회원</strong>으로 가입하시면 생활관리용품 전 품목 <strong>최대 26% 즉시 할인 혜택</strong>을 받으실 수 있습니다.
              </span>
            )}
          </div>
          {!isPaidMember && (
            <button
              onClick={() => {
                onClose();
                onOpenMemberModal();
              }}
              className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded text-xs transition-colors shrink-0"
            >
              1,000원 회원가입/로그인
            </button>
          )}
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 px-6 py-3 bg-slate-50 border-b border-slate-200 overflow-x-auto shrink-0">
          {[
            { id: 'all', label: '전체 상품' },
            { id: 'waterproofing', label: '누수·방수 관리' },
            { id: 'bathroom', label: '욕실·위생 관리' },
            { id: 'plumbing', label: '배관·설비 관리' },
            { id: 'interior', label: '인테리어 보수' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProducts.map((product) => {
              const displayPrice = isPaidMember ? product.memberPrice : product.regularPrice;
              return (
                <div
                  key={product.id}
                  className="bg-white rounded-xl border border-slate-200 hover:border-orange-300 hover:shadow-md transition-all flex flex-col overflow-hidden group"
                >
                  <div className="relative h-44 bg-slate-100 overflow-hidden">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[11px] font-medium">
                      {product.categoryLabel}
                    </div>
                    {product.discountPct > 0 && (
                      <div className="absolute top-2 right-2 bg-orange-600 text-white px-2 py-0.5 rounded text-xs font-bold shadow">
                        회원 {product.discountPct}% OFF
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-orange-600 transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{product.summary}</p>
                      <div className="text-[11px] text-slate-600 mt-2 bg-slate-50 p-2 rounded border border-slate-100">
                        <span className="font-semibold text-slate-700">규격:</span> {product.capacity}
                      </div>

                      {/* Engineer tip */}
                      <div className="mt-2.5 text-[11px] text-emerald-800 bg-emerald-50/70 p-2 rounded border border-emerald-200/50 flex items-start gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>정석 팁:</strong> {product.engineerTip}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <div className="flex items-baseline justify-between mb-3">
                        <div>
                          <div className="text-[11px] text-slate-600 line-through">
                            정상가 {product.regularPrice.toLocaleString()}원
                          </div>
                          <div className="text-base font-extrabold text-orange-600 font-mono">
                            {displayPrice.toLocaleString()}
                            <span className="text-xs font-normal text-slate-700 ml-1">원</span>
                            {isPaidMember && (
                              <span className="ml-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                유료회원가
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenOrder(product)}
                        className="w-full py-2 bg-slate-900 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        바로 구매하기
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-slate-600" /> 오후 2시 이전 주문 시 당일 출고
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-600" /> 시공 실패 시 24시 직통 기술 상담 지원
            </span>
          </div>
          <a
            href={`tel:${DIRECT_PHONE.replace(/-/g, '')}`}
            className="text-orange-600 font-semibold hover:underline flex items-center gap-1"
          >
            <Phone className="w-3.5 h-3.5" /> 대량 납품 및 현장 직발송 문의 ({DIRECT_PHONE})
          </a>
        </div>
      </div>

      {/* Checkout / Order Form Modal */}
      {isCheckoutOpen && selectedProduct && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white shrink-0">
              <h3 className="font-bold text-sm">생활관리용품 주문 결제</h3>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {completedOrder ? (
              <div className="p-6 text-center space-y-4 overflow-y-auto">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900">주문 및 결제가 완료되었습니다!</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    주문번호: <span className="font-mono font-semibold">{completedOrder.orderId}</span>
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl text-left text-xs space-y-2 border border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-500">주문 상품:</span>
                    <span className="font-semibold text-slate-900">
                      {selectedProduct.name} ({orderQuantity}개)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">받는 분:</span>
                    <span className="font-semibold text-slate-900">
                      {completedOrder.userName} ({completedOrder.userPhone})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">배송지:</span>
                    <span className="font-semibold text-slate-900 text-right">
                      {completedOrder.deliveryAddress} {completedOrder.detailAddress}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-sm">
                    <span className="text-slate-700">최종 결제 금액:</span>
                    <span className="text-orange-600 font-mono">
                      {completedOrder.finalAmount.toLocaleString()}원
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-500 bg-amber-50 p-3 rounded border border-amber-200 text-left">
                  안내: 정석공사 물류센터에서 포장 후 CJ대한통운으로 당일 출고됩니다.
                </div>

                <button
                  onClick={() => {
                    setIsCheckoutOpen(false);
                    setCompletedOrder(null);
                  }}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg"
                >
                  확인 완료
                </button>
              </div>
            ) : (
              <form onSubmit={handleProcessOrder} className="p-5 overflow-y-auto space-y-4 text-xs">
                {/* Selected Item Summary */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-semibold text-slate-900 text-sm block">
                      {selectedProduct.name}
                    </span>
                    <span className="text-slate-500 text-[11px]">{selectedProduct.capacity}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setOrderQuantity(Math.max(1, orderQuantity - 1))}
                      className="w-7 h-7 bg-white border border-slate-300 rounded font-bold text-sm flex items-center justify-center hover:bg-slate-100"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-sm px-1">{orderQuantity}</span>
                    <button
                      type="button"
                      onClick={() => setOrderQuantity(orderQuantity + 1)}
                      className="w-7 h-7 bg-white border border-slate-300 rounded font-bold text-sm flex items-center justify-center hover:bg-slate-100"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Recipient Info */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 text-xs">배송 정보 입력</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">받는 분 성함</label>
                      <input
                        type="text"
                        required
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="홍길동"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-orange-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">연락처</label>
                      <input
                        type="tel"
                        required
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value)}
                        placeholder="010-0000-0000"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-orange-500 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">기본 배송지 주소</label>
                    <input
                      type="text"
                      required
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="서울시 강남구 테헤란로 123"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-orange-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">상세 주소 및 동·호수</label>
                    <input
                      type="text"
                      value={detailAddress}
                      onChange={(e) => setDetailAddress(e.target.value)}
                      placeholder="101동 1204호"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-orange-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">배송 요청사항</label>
                    <input
                      type="text"
                      value={deliveryMemo}
                      onChange={(e) => setDeliveryMemo(e.target.value)}
                      placeholder="문 앞에 놓아주세요"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-orange-500 outline-none"
                    />
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 text-xs">결제 수단 선택</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'card', label: '신용/체크카드' },
                      { id: 'kakaopay', label: '카카오페이' },
                      { id: 'tosspay', label: '토스페이' },
                    ].map((m) => (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => setPaymentMethod(m.id as any)}
                        className={`py-2 text-center rounded border font-medium ${
                          paymentMethod === m.id
                            ? 'border-orange-500 bg-orange-50 text-orange-700 font-bold'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount Calculation Summary */}
                {(() => {
                  const { regularTotal, finalTotal, discount } = calculateTotal();
                  return (
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex justify-between text-slate-500">
                        <span>상품 정가 합계:</span>
                        <span>{regularTotal.toLocaleString()}원</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-emerald-600 font-medium">
                          <span>1,000원 유료회원 특별 할인:</span>
                          <span>-{discount.toLocaleString()}원</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-500">
                        <span>배송비:</span>
                        <span className="text-emerald-600 font-medium">무료 배송 (정석공사 지원)</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-900 text-sm pt-2 border-t border-slate-200">
                        <span>최종 결제 금액:</span>
                        <span className="text-orange-600 font-mono text-base font-extrabold">
                          {finalTotal.toLocaleString()}원
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <button
                  type="submit"
                  disabled={isSubmittingOrder}
                  className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  {isSubmittingOrder ? '결제 처리 중...' : `${calculateTotal().finalTotal.toLocaleString()}원 결제하고 주문하기`}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
