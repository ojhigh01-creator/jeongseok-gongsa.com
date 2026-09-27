import React, { useState, useMemo } from 'react';
import {
  X,
  Calculator,
  Phone,
  MessageSquare,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Copy,
  Check,
  FileCheck2,
} from 'lucide-react';
import { SERVICES_DATA, ServiceCategoryKey, DIRECT_PHONE } from '../data/constructionData';

interface SelfEstimateModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: ServiceCategoryKey;
  initialPyeong?: number;
  onProceedToConsult: (summaryText: string, categoryLabel: string) => void;
}

export const SelfEstimateModal: React.FC<SelfEstimateModalProps> = ({
  isOpen,
  onClose,
  initialCategory = 'demolition',
  initialPyeong = 25,
  onProceedToConsult,
}) => {
  const [selectedServiceId, setSelectedServiceId] = useState<string>(() => {
    const found = SERVICES_DATA.find((s) => s.category === initialCategory);
    return found ? found.id : SERVICES_DATA[0].id;
  });
  const [pyeong, setPyeong] = useState<number>(initialPyeong);
  const [hasElevator, setHasElevator] = useState<boolean>(true);
  const [needsWasteHaul, setNeedsWasteHaul] = useState<boolean>(true);
  const [isNightWork, setIsNightWork] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  React.useEffect(() => {
    if (initialCategory && initialCategory !== 'all') {
      const found = SERVICES_DATA.find((s) => s.category === initialCategory);
      if (found) setSelectedServiceId(found.id);
    }
    if (initialPyeong) {
      setPyeong(initialPyeong);
    }
  }, [initialCategory, initialPyeong, isOpen]);

  const currentService = useMemo(
    () => SERVICES_DATA.find((s) => s.id === selectedServiceId) || SERVICES_DATA[0],
    [selectedServiceId]
  );

  const calculation = useMemo(() => {
    const scaleFactor = pyeong / 10;
    const skilledPum = Number(
      (currentService.pumsem.skilledLaborPer10Pyeong * scaleFactor).toFixed(1)
    );
    const generalPum = Number(
      (currentService.pumsem.generalLaborPer10Pyeong * scaleFactor).toFixed(1)
    );
    const totalPum = Number((skilledPum + generalPum).toFixed(1));

    const baseTotal = currentService.minFlatCost + pyeong * currentService.basePricePerPyeong;
    const materialCost = Math.round(
      baseTotal * 0.42 * (1 + currentService.pumsem.materialAllowancePct / 100)
    );
    const laborCost = Math.round(baseTotal * 0.38);
    const wasteCost = needsWasteHaul ? Math.round(baseTotal * 0.14 + (hasElevator ? 0 : 28)) : 0;
    const nightSurcharge = isNightWork ? Math.round(laborCost * 0.25) : 0;
    const safetyAndManagement = Math.max(15, Math.round(baseTotal * 0.06));
    const totalMin = materialCost + laborCost + wasteCost + nightSurcharge + safetyAndManagement;
    const totalMax = Math.round(totalMin * 1.12);

    return {
      materialCost,
      laborCost,
      wasteCost,
      nightSurcharge,
      safetyAndManagement,
      totalMin,
      totalMax,
      skilledPum,
      generalPum,
      totalPum,
    };
  }, [currentService, pyeong, hasElevator, needsWasteHaul, isNightWork]);

  if (!isOpen) return null;

  const summaryString = `[${currentService.title} · 건설공사 표준품셈 산정] ${pyeong}평 기준 예상가 ${calculation.totalMin.toLocaleString()}만 ~ ${calculation.totalMax.toLocaleString()}만 원 (자재 ${calculation.materialCost}만 [할증 ${currentService.pumsem.materialAllowancePct}%] / 직접노무 ${calculation.laborCost}만 [총 ${calculation.totalPum}품] / 폐기물·기계경비 ${calculation.wasteCost}만 / 1년 무상 A/S 보증 포함)`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(summaryString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calculator-modal-title"
    >
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <div className="flex items-start justify-between border-b border-slate-200 pb-4">
          <div>
            <p className="text-xs font-semibold text-orange-600">
              건설부(국토교통부) 제정 ‘건설공사 표준품셈’ 및 시중노임단가 100% 연동
            </p>
            <h2
              id="calculator-modal-title"
              className="mt-1 flex items-center gap-2 text-xl font-bold text-slate-900 sm:text-2xl"
            >
              <Calculator className="h-5 w-5 text-orange-600" />
              정석공사 표준품셈 셀프 견적 계산기
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Inputs */}
          <div className="space-y-5 lg:col-span-6">
            <div>
              <label
                htmlFor="service-select"
                className="block text-sm font-semibold text-slate-800"
              >
                1. 시공 공종 선택
              </label>
              <select
                id="service-select"
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-orange-600 focus:bg-white focus:outline-none"
              >
                {SERVICES_DATA.map((srv) => (
                  <option key={srv.id} value={srv.id}>
                    {srv.title} ({srv.unitPriceLabel})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="pyeong-range"
                  className="text-sm font-semibold text-slate-800"
                >
                  2. 시공 면적 (평수)
                </label>
                <span className="font-mono-num text-base font-bold text-orange-600">
                  {pyeong}평 (약 {Math.round(pyeong * 3.3058)}㎡)
                </span>
              </div>
              <input
                id="pyeong-range"
                type="range"
                min={3}
                max={120}
                value={pyeong}
                onChange={(e) => setPyeong(Number(e.target.value))}
                className="mt-2 h-2 w-full cursor-pointer accent-orange-600"
              />
              <div className="mt-1.5 flex justify-between text-xs text-slate-500 font-mono-num">
                <span>3평 (소형/화장실)</span>
                <span>30평 (표준 상가)</span>
                <span>60평</span>
                <span>120평</span>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <p className="text-sm font-semibold text-slate-800">3. 현장 여건 및 표준품셈 할증 설정</p>
              <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm hover:bg-slate-50">
                <span className="text-slate-700">화물/승객용 엘리베이터 소운반 가능</span>
                <input
                  type="checkbox"
                  checked={hasElevator}
                  onChange={(e) => setHasElevator(e.target.checked)}
                  className="h-4 w-4 accent-orange-600"
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm hover:bg-slate-50">
                <span className="text-slate-700">폐기물 적법 반출 (올바로 시스템 정산) 포함</span>
                <input
                  type="checkbox"
                  checked={needsWasteHaul}
                  onChange={(e) => setNeedsWasteHaul(e.target.checked)}
                  className="h-4 w-4 accent-orange-600"
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm hover:bg-slate-50">
                <span className="text-slate-700">야간·휴일 작업 (표준품셈 노무비 25% 할증 적용)</span>
                <input
                  type="checkbox"
                  checked={isNightWork}
                  onChange={(e) => setIsNightWork(e.target.checked)}
                  className="h-4 w-4 accent-orange-600"
                />
              </label>
            </div>

            {/* Pumsem Reference Box */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600">
              <p className="flex items-center gap-1.5 font-bold text-slate-900">
                <FileCheck2 className="h-4 w-4 text-orange-600 shrink-0" />
                적용 표준품셈 근거
              </p>
              <p className="mt-1 font-medium text-slate-800">
                {currentService.pumsem.chapterCode}
              </p>
              <p className="mt-0.5 text-slate-500">{currentService.pumsem.basisDescription}</p>
            </div>
          </div>

          {/* Right Column: Transparent Itemized Sheet */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-900 p-5 text-white lg:col-span-6">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs text-slate-400">건설공사 표준품셈 일위대가 내역서</span>
                <span className="text-xs font-medium text-orange-400">
                  1년 무상 시공 A/S 보증 포함
                </span>
              </div>

              <div className="mt-4 space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">
                    KS 정품 자재비 (할증 {currentService.pumsem.materialAllowancePct}% 포함)
                  </span>
                  <span className="font-mono-num font-semibold text-white">
                    {calculation.materialCost.toLocaleString()}만 원
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">
                    표준품셈 직접노무비 ({calculation.totalPum}품)
                  </span>
                  <span className="font-mono-num font-semibold text-white">
                    {calculation.laborCost.toLocaleString()}만 원
                  </span>
                </div>
                <p className="font-mono-num text-right text-[11px] text-slate-400">
                  ↳ 기능공 {calculation.skilledPum}품 + 보통인부 {calculation.generalPum}품
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">
                    폐기물 반출·기계경비 {!hasElevator && '(인력 양중 포함)'}
                  </span>
                  <span className="font-mono-num font-semibold text-white">
                    {calculation.wasteCost.toLocaleString()}만 원
                  </span>
                </div>
                {calculation.nightSurcharge > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">야간·휴일 품셈 노무 할증 (25%)</span>
                    <span className="font-mono-num font-semibold text-orange-300">
                      +{calculation.nightSurcharge.toLocaleString()}만 원
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">공구손료(3%)·산재보험·안전관리비</span>
                  <span className="font-mono-num font-semibold text-white">
                    {calculation.safetyAndManagement.toLocaleString()}만 원
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 text-xs text-emerald-400">
                  <span>현장 임의 추가금 / 덤터기 할증</span>
                  <span className="font-mono-num font-bold">0원 (계약서 명시 보장)</span>
                </div>
              </div>

              <div className="mt-5 border-t border-slate-800 pt-4">
                <p className="text-xs text-slate-400">
                  표준품셈 산정 예상 총 공사비 범위 (VAT 별도)
                </p>
                <p className="mt-1 font-mono-num text-2xl font-bold text-orange-400 sm:text-3xl">
                  {calculation.totalMin.toLocaleString()}만 ~ {calculation.totalMax.toLocaleString()}만 원
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  예상 소요 기간: {currentService.duration} · {currentService.warrantyNote}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700 whitespace-nowrap"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                {copied ? '견적 내역 복사됨' : '내역서 복사'}
              </button>
              <button
                type="button"
                onClick={() =>
                  onProceedToConsult(summaryString, currentService.categoryLabel)
                }
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-500 whitespace-nowrap"
              >
                이 내역으로 무료 방문실측·상담 신청
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefilledNote?: string;
  prefilledCategory?: string;
}

export const ConsultationModal: React.FC<ConsultationModalProps> = ({
  isOpen,
  onClose,
  prefilledNote = '',
  prefilledCategory = '철거 · 원상복구',
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState(prefilledCategory);
  const [locationAndNote, setLocationAndNote] = useState(prefilledNote);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  React.useEffect(() => {
    if (prefilledNote) setLocationAndNote(prefilledNote);
    if (prefilledCategory) setCategory(prefilledCategory);
    setSubmitted(false);
    setErrorMessage('');
  }, [prefilledNote, prefilledCategory, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedPhone = phone.replace(/[^0-9]/g, '');
    if (name.trim().length < 2) {
      setErrorMessage('성함 또는 업체명을 2자 이상 입력해 주세요.');
      return;
    }
    if (cleanedPhone.length < 9) {
      setErrorMessage('올바른 연락처(휴대폰 또는 유선번호)를 입력해 주세요.');
      return;
    }
    setErrorMessage('');
    setSubmitted(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consult-modal-title"
    >
      <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <div className="flex items-start justify-between border-b border-slate-200 pb-4">
          <div>
            <p className="text-xs font-semibold text-orange-600">
              365일 24시간 엔지니어 직통 응대 · 현장 추가금 0원 보장
            </p>
            <h2
              id="consult-modal-title"
              className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl"
            >
              실시간 1:1 정석 공사 상담 & 직통 연결
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Direct Channel Bar */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <a
            href={`tel:${DIRECT_PHONE}`}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-900 px-4 py-3.5 text-white transition-colors hover:bg-slate-800"
          >
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-orange-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-300">24시 엔지니어 직통상담</p>
                <p className="font-mono-num text-base font-bold">{DIRECT_PHONE}</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-orange-400 whitespace-nowrap">즉시 통화</span>
          </a>

          <button
            type="button"
            onClick={() => {
              setLocationAndNote((prev) =>
                prev ? prev : '[카카오 알림톡 사진 견적 및 1:1 실시간 채팅 상담 요청]'
              );
            }}
            className="flex items-center justify-between rounded-lg border border-amber-300 bg-[#FEE500] px-4 py-3.5 text-slate-900 transition-colors hover:bg-[#FDD800]"
          >
            <div className="flex items-center gap-3 text-left">
              <MessageSquare className="h-5 w-5 text-slate-900 shrink-0" />
              <div>
                <p className="text-xs text-slate-700">카카오톡 공식 채널</p>
                <p className="text-sm font-bold">@정석공사_30초견적</p>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-900 whitespace-nowrap">1:1 연결</span>
          </button>
        </div>

        {submitted ? (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/70 p-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <h3 className="mt-3 text-lg font-bold text-slate-900">
              {name} 고객님, 1:1 정석 상담 접수가 완료되었습니다.
            </h3>
            <p className="mt-1.5 text-sm text-slate-600">
              담당 시공 엔지니어가 <span className="font-mono-num font-semibold text-slate-900">{phone}</span> 번호로
              10분 이내에 건설공사 표준품셈 기반 상세 단가표와 함께 연락드립니다.
            </p>
            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 text-left text-xs text-slate-600">
              <p className="font-semibold text-slate-900">접수 내역 요약</p>
              <p className="mt-1">희망 공종: {category}</p>
              {locationAndNote && <p className="mt-0.5">상세 메모: {locationAndNote}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              확인 완료
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  고객명 / 업체명 <span className="text-orange-600">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 홍길동 (역삼 카페)"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-orange-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  연락처 (알림톡 견적서 수신) <span className="text-orange-600">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="예: 010-1234-5678"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm font-mono-num text-slate-900 focus:border-orange-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">희망 시공 분야</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-orange-600 focus:outline-none"
              >
                <option value="철거 · 원상복구">철거 · 원상복구 (상가/오피스/주거)</option>
                <option value="화장실 성능개선 & 리모델링 (특화)">
                  화장실 성능개선 & 리모델링 (누수·악취·방수 특화)
                </option>
                <option value="데크시공 리모델링 (특화)">
                  데크시공 리모델링 (아연도금 각관·합성목재 특화)
                </option>
                <option value="방수 · 외벽보수">방수 · 외벽보수 (옥상 우레탄 3중 방수/실리콘)</option>
                <option value="인테리어 · 리모델링">인테리어 · 리모델링 (수평몰탈/타일/도장)</option>
                <option value="설비 · 금속 · 기타">설비 · 금속 · 기타 (급배수 배관/금속 가벽)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                현장 지역 · 평수 · 요청사항 (표준품셈 AI 견적 연동 내역)
              </label>
              <textarea
                rows={3}
                value={locationAndNote}
                onChange={(e) => setLocationAndNote(e.target.value)}
                placeholder="예: 서울시 강남구 25평 상가 원상복구, 다음 주 월요일 착공 희망합니다."
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-orange-600 focus:outline-none"
              />
            </div>

            {errorMessage && (
              <p className="rounded-lg bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-600">
                {errorMessage}
              </p>
            )}

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <ShieldCheck className="h-4 w-4 text-orange-600 shrink-0" />
                <span>무료 방문 실측 · 1년 무상 시공 A/S 전자보증서 발급</span>
              </div>
              <button
                type="submit"
                className="rounded-lg bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-500 whitespace-nowrap"
              >
                무료 실측 · 정석 견적 신청
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
