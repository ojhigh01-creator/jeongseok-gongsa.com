import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Ticket,
  FileText,
  ShoppingBag,
  CreditCard,
  CheckCircle,
  Phone,
  Sparkles,
  LogOut,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { MemberProfile, EstimateTicket, StoredEstimate, SupplyOrder } from '../types/membership';
import {
  loginOrRegisterMember,
  logoutCurrentMember,
  getMemberActiveTickets,
  getSavedEstimates,
  getMemberOrders,
  addTicket,
  saveCurrentMember,
} from '../utils/memberStorage';
import { DIRECT_PHONE } from '../data/constructionData';

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMember: MemberProfile | null;
  onMemberUpdated: (member: MemberProfile | null) => void;
  defaultTab?: 'profile' | 'tickets' | 'estimates' | 'orders';
}

export const MemberModal: React.FC<MemberModalProps> = ({
  isOpen,
  onClose,
  currentMember,
  onMemberUpdated,
  defaultTab = 'profile',
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'tickets' | 'estimates' | 'orders'>(
    defaultTab
  );

  // Login form state
  const [loginPhone, setLoginPhone] = useState<string>('');
  const [loginName, setLoginName] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [isSubmittingLogin, setIsSubmittingLogin] = useState<boolean>(false);

  // Ticket recharge state
  const [ticketCountToBuy, setTicketCountToBuy] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'kakaopay' | 'tosspay' | 'vbank'>('card');
  const [isRecharging, setIsRecharging] = useState<boolean>(false);
  const [rechargeSuccessMsg, setRechargeSuccessMsg] = useState<string>('');

  // Data
  const [ticketsList, setTicketsList] = useState<EstimateTicket[]>([]);
  const [estimatesList, setEstimatesList] = useState<StoredEstimate[]>([]);
  const [ordersList, setOrdersList] = useState<SupplyOrder[]>([]);

  useEffect(() => {
    if (isOpen && currentMember) {
      setTicketsList(getMemberActiveTickets(currentMember.id));
      setEstimatesList(getSavedEstimates(currentMember.id));
      setOrdersList(getMemberOrders(currentMember.id));
    }
  }, [isOpen, currentMember]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginPhone.trim()) {
      setLoginError('휴대폰 번호를 입력해 주세요.');
      return;
    }
    const clean = loginPhone.replace(/[^0-9]/g, '');
    if (clean.length < 10) {
      setLoginError('올바른 10~11자리 휴대폰 번호를 입력해 주세요.');
      return;
    }

    setIsSubmittingLogin(true);
    try {
      const member = await loginOrRegisterMember(loginPhone.trim(), loginName.trim() || '고객님');
      onMemberUpdated(member);
      setTicketsList(getMemberActiveTickets(member.id));
      setEstimatesList(getSavedEstimates(member.id));
      setOrdersList(getMemberOrders(member.id));
      setActiveTab('profile');
    } catch (err) {
      setLoginError('로그인 처리 중 오류가 발생했습니다.');
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  const handleLogout = () => {
    logoutCurrentMember();
    onMemberUpdated(null);
    setTicketsList([]);
    setEstimatesList([]);
    setOrdersList([]);
  };

  const handleRechargeTicket = async () => {
    if (!currentMember) return;
    setIsRecharging(true);
    setRechargeSuccessMsg('');

    try {
      // Issue ticket through server endpoint
      const response = await fetch('/api/ticket/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentMember.id,
          userPhone: currentMember.phone,
          userName: currentMember.name,
          paymentMethod,
          paymentOrderId: `PAY-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || '이용권 발급에 실패했습니다.');
      }

      await addTicket(data.ticket);

      // Refresh state
      const updatedMember: MemberProfile = {
        ...currentMember,
        tier: 'paid_member',
        ticketBalance: (currentMember.ticketBalance || 0) + 1,
        totalTicketsPurchased: (currentMember.totalTicketsPurchased || 0) + 1,
      };
      await saveCurrentMember(updatedMember);
      onMemberUpdated(updatedMember);

      setTicketsList(getMemberActiveTickets(updatedMember.id));
      setRechargeSuccessMsg(
        '1,000원 결제가 완료되어 AI 견적 이용권 1장이 즉시 충전되었습니다! 이제 사진 분석을 진행하실 수 있습니다.'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '결제 처리 중 오류가 발생했습니다.';
      alert(msg);
    } finally {
      setIsRecharging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-md">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">건우 정석공사 회원 관리 및 이용권</h2>
                {currentMember?.tier === 'paid_member' && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
                    1,000원 유료회원
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                AI 정밀 견적 이용권 관리 · 견적서 보관함 · 생활관리용품 주문 내역
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

        {!currentMember ? (
          /* Login / Signup Form */
          <div className="p-6 overflow-y-auto space-y-5">
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-sm text-orange-700">
                <Sparkles className="w-4 h-4 text-orange-600" />
                1,000원 유료회원 AI 견적 & 생활관리용품 혜택
              </div>
              <p>
                휴대폰 번호로 1초 간편 로그인/가입 후, <strong>1,000원 이용권</strong>으로 실제 현장 사진 AI 정밀 분석을 받으실 수 있습니다.
              </p>
              <p className="text-slate-600">
                * 유료회원은 생활관리용품 전 품목 최대 26% 평생 할인 및 1년 무상 A/S가 보장됩니다.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  휴대폰 번호 <span className="text-orange-600">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  placeholder="010-1234-5678 (숫자만 입력 가능)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  성함 / 닉네임 (선택)
                </label>
                <input
                  type="text"
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  placeholder="홍길동"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              {loginError && (
                <div className="p-2.5 bg-red-50 text-red-700 border border-red-200 rounded text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingLogin}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <User className="w-4 h-4" />
                {isSubmittingLogin ? '로그인 처리 중...' : '휴대폰 번호로 간편 로그인 / 가입'}
              </button>
            </form>
          </div>
        ) : (
          /* Logged In Member Workspace */
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6 shrink-0 overflow-x-auto">
              {[
                { id: 'profile', label: '내 정보 & 이용권 충전', icon: Ticket },
                { id: 'estimates', label: `내 견적 보관함 (${estimatesList.length})`, icon: FileText },
                { id: 'orders', label: `생활용품 주문 (${ordersList.length})`, icon: ShoppingBag },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 py-3 px-4 text-xs font-bold border-b-2 transition-colors shrink-0 ${
                      activeTab === tab.id
                        ? 'border-orange-600 text-orange-600 bg-white'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  {/* Member Profile Card */}
                  <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold">{currentMember.name}님</h3>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              currentMember.tier === 'paid_member'
                                ? 'bg-orange-500 text-white'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {currentMember.tier === 'paid_member' ? '1,000원 유료회원' : '일반회원'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">연락처: {currentMember.phone}</p>
                      </div>

                      <button
                        onClick={handleLogout}
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded"
                      >
                        <LogOut className="w-3.5 h-3.5" /> 로그아웃
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-800 text-center">
                      <div className="bg-slate-800/60 p-3 rounded-xl">
                        <div className="text-[11px] text-slate-400">보유 AI 견적권</div>
                        <div className="text-xl font-extrabold text-orange-400 font-mono mt-0.5">
                          {currentMember.ticketBalance || 0}
                          <span className="text-xs font-normal text-slate-400 ml-1">장</span>
                        </div>
                      </div>
                      <div className="bg-slate-800/60 p-3 rounded-xl">
                        <div className="text-[11px] text-slate-400">보관된 견적서</div>
                        <div className="text-xl font-extrabold text-white font-mono mt-0.5">
                          {estimatesList.length}
                          <span className="text-xs font-normal text-slate-400 ml-1">건</span>
                        </div>
                      </div>
                      <div className="bg-slate-800/60 p-3 rounded-xl">
                        <div className="text-[11px] text-slate-400">생활용품 주문</div>
                        <div className="text-xl font-extrabold text-emerald-400 font-mono mt-0.5">
                          {ordersList.length}
                          <span className="text-xs font-normal text-slate-400 ml-1">건</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 1,000 KRW Ticket Recharge Box */}
                  <div className="bg-orange-50/70 border border-orange-200 rounded-2xl p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-orange-800 font-bold text-sm">
                          <Ticket className="w-4 h-4 text-orange-600" />
                          AI 정밀 견적 이용권 구매 (1건 = 1,000원)
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          결제 완료 시 서버에서 암호화된 단일 검증 토큰이 즉시 발급되며, 사진 업로드 후 정밀 Gemini AI 분석과 국토교통부 표준품셈 공사비 계산 엔진이 즉시 가동됩니다.
                        </p>
                      </div>
                      <span className="text-xl font-extrabold text-orange-600 font-mono shrink-0">
                        1,000원
                      </span>
                    </div>

                    {rechargeSuccessMsg && (
                      <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>{rechargeSuccessMsg}</div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 block">결제 수단 선택</label>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        {[
                          { id: 'card', label: '신용/체크카드' },
                          { id: 'kakaopay', label: '카카오페이' },
                          { id: 'tosspay', label: '토스페이' },
                        ].map((m) => (
                          <button
                            type="button"
                            key={m.id}
                            onClick={() => setPaymentMethod(m.id as any)}
                            className={`py-2 text-center rounded-lg border font-semibold ${
                              paymentMethod === m.id
                                ? 'border-orange-500 bg-orange-600 text-white shadow-sm'
                                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleRechargeTicket}
                      disabled={isRecharging}
                      className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      {isRecharging ? '결제 처리 중...' : '1,000원 결제하고 AI 견적권 충전하기'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'estimates' && (
                <div className="space-y-4">
                  {estimatesList.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      아직 저장된 AI 견적서가 없습니다.
                      <div className="mt-2 text-slate-500">
                        상단 [AI 견적] 메뉴에서 현장 사진을 분석하시면 여기에 자동으로 보관됩니다.
                      </div>
                    </div>
                  ) : (
                    estimatesList.map((est) => (
                      <div
                        key={est.id}
                        className="bg-white p-4 rounded-xl border border-slate-200 hover:border-orange-300 hover:shadow-sm transition-all space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm">
                            {est.categoryLabel} ({est.pyeong}평 · {est.floor})
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(est.createdAt).toLocaleDateString('ko-KR')}
                          </span>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded text-slate-600">
                          {est.analysisSummary}
                        </div>

                        <div className="flex items-baseline justify-between pt-1">
                          <span className="text-slate-500">예상 공사비 (VAT 포함):</span>
                          <span className="font-mono font-extrabold text-orange-600 text-sm">
                            {(est.totalEstimateMin / 10000).toFixed(0)}만 ~ {(est.totalEstimateMax / 10000).toFixed(0)}만원
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex justify-end">
                          <a
                            href={`tel:${DIRECT_PHONE.replace(/-/g, '')}`}
                            className="text-orange-600 font-semibold hover:underline flex items-center gap-1 text-[11px]"
                          >
                            <Phone className="w-3 h-3" /> 이 견적으로 엔지니어 직통 상담 ({DIRECT_PHONE})
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'orders' && (
                <div className="space-y-4">
                  {ordersList.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      생활관리용품 주문 내역이 없습니다.
                    </div>
                  ) : (
                    ordersList.map((order) => (
                      <div
                        key={order.orderId}
                        className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="font-mono text-slate-500 font-semibold">
                            {order.orderId}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[11px]">
                            결제 완료 (당일 출고 준비)
                          </span>
                        </div>

                        <div className="space-y-1">
                          {order.items.map((it, i) => (
                            <div key={i} className="flex justify-between font-semibold text-slate-800">
                              <span>
                                {it.productName} ({it.quantity}개)
                              </span>
                              <span className="font-mono">{it.totalPrice.toLocaleString()}원</span>
                            </div>
                          ))}
                        </div>

                        <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded">
                          배송지: {order.deliveryAddress} {order.detailAddress}
                        </div>

                        <div className="flex justify-between items-baseline pt-1 font-bold text-slate-900">
                          <span>결제 총액:</span>
                          <span className="text-orange-600 font-mono text-sm">
                            {order.finalAmount.toLocaleString()}원
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
