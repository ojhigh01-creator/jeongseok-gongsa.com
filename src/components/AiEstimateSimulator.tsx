import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Camera,
  Upload,
  CheckCircle,
  ArrowRight,
  Calculator,
  RefreshCw,
  Wrench,
  FileCheck2,
  AlertTriangle,
  Plus,
  Trash2,
  Sparkles,
  Smartphone,
  Images,
  Info,
  Phone,
  ShieldCheck,
  ChevronRight,
  RotateCcw,
  Ticket,
  Lock,
} from 'lucide-react';
import {
  SAMPLE_PHOTO_PRESETS,
  SERVICES_DATA,
  SERVICE_TABS,
  ServiceCategoryKey,
  ServiceItem,
  HERO_VISUAL,
  DIRECT_PHONE,
} from '../data/constructionData';
import {
  processImageFileWithSpecs,
  validateImageFileBeforeUpload,
  PHOTO_UPLOAD_SPECS,
} from '../utils/galleryStorage';
import {
  calculatePumsemEstimate,
  PumsemCalculationResult,
} from '../utils/pumsemCalculator';
import { MemberProfile } from '../types/membership';
import {
  getMemberActiveTickets,
  markTicketUsed,
  saveEstimate,
} from '../utils/memberStorage';

interface UploadedPhoto {
  id: string;
  url: string;
  name: string;
  specSummary: string;
  isPortrait: boolean;
}

export interface GeminiAiAnalysis {
  detectedCategory: ServiceCategoryKey | string;
  categoryConfidence: number;
  surfaceCondition: string;
  damageSeverity: '경미' | '보통' | '심각' | string;
  detectedElements: string[];
  recommendedScope: string[];
  uncertainItems: string[];
  wasteTonsEstimated: string;
  siteKeyRisk: string;
}

const MAX_UPLOAD_PHOTOS = 5;

interface AiEstimateSimulatorProps {
  selectedCategoryFromService?: ServiceCategoryKey;
  servicesList?: ServiceItem[];
  onOpenCalculator: (category: ServiceCategoryKey, pyeong: number) => void;
  onOpenConsultation: (summary: string, categoryLabel: string) => void;
  currentMember?: MemberProfile | null;
  onOpenMemberModal?: (defaultTab?: 'profile' | 'tickets' | 'estimates') => void;
  onMemberUpdated?: (member: MemberProfile | null) => void;
}

type SimulatorStep = 'input' | 'analyzing' | 'result';

export const AiEstimateSimulator: React.FC<AiEstimateSimulatorProps> = ({
  selectedCategoryFromService,
  servicesList = SERVICES_DATA,
  onOpenCalculator,
  onOpenConsultation,
  currentMember = null,
  onOpenMemberModal,
  onMemberUpdated,
}) => {
  // Step State
  const [currentStep, setCurrentStep] = useState<SimulatorStep>('input');

  // Selected Category & Presets
  const [activeCategory, setActiveCategory] = useState<ServiceCategoryKey>(
    selectedCategoryFromService && selectedCategoryFromService !== 'all'
      ? selectedCategoryFromService
      : 'demolition'
  );
  const [activePresetId, setActivePresetId] = useState<string>(SAMPLE_PHOTO_PRESETS[0].id);

  // Uploaded Photos
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const [activeUploadedIndex, setActiveUploadedIndex] = useState<number>(0);
  const [uploadNotice, setUploadNotice] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');
  const [isProcessingUpload, setIsProcessingUpload] = useState<boolean>(false);
  const [fitContainMode, setFitContainMode] = useState<boolean>(false);
  const [brokenPhotoIds, setBrokenPhotoIds] = useState<Record<string, boolean>>({});

  // Site Conditions
  const [pyeong, setPyeong] = useState<number>(25);
  const [floor, setFloor] = useState<string>('1층');
  const [hasElevator, setHasElevator] = useState<boolean>(true);
  const [additionalNotes, setAdditionalNotes] = useState<string>('');

  // AI & Calculation Output
  const [aiAnalysis, setAiAnalysis] = useState<GeminiAiAnalysis | null>(null);
  const [calculationResult, setCalculationResult] = useState<PumsemCalculationResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string>('');
  const [apiKeyNotice, setApiKeyNotice] = useState<string>('');

  // File Input Refs
  const albumInputRef = useRef<HTMLInputElement | null>(null);
  const cameraCaptureInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (selectedCategoryFromService && selectedCategoryFromService !== 'all') {
      setActiveCategory(selectedCategoryFromService);
      const matchedPreset =
        SAMPLE_PHOTO_PRESETS.find((p) => p.category === selectedCategoryFromService) ||
        SAMPLE_PHOTO_PRESETS[0];
      setActivePresetId(matchedPreset.id);
      setPyeong(matchedPreset.defaultPyeong);
    }
  }, [selectedCategoryFromService]);

  const activePreset = useMemo(
    () => SAMPLE_PHOTO_PRESETS.find((p) => p.id === activePresetId) || SAMPLE_PHOTO_PRESETS[0],
    [activePresetId]
  );

  const matchedService = useMemo(
    () =>
      servicesList.find((s) => s.category === activeCategory) ||
      servicesList[0] ||
      SERVICES_DATA[0],
    [activeCategory, servicesList]
  );

  // Current Photo for Analysis
  const currentUploadedPhoto =
    uploadedPhotos.length > 0
      ? uploadedPhotos[Math.min(activeUploadedIndex, uploadedPhotos.length - 1)]
      : null;

  const currentPhotoKey = currentUploadedPhoto?.id || activePreset.id;
  const isCurrentBroken = brokenPhotoIds[currentPhotoKey] || false;

  const displayImage =
    currentUploadedPhoto?.url ||
    matchedService.photos[0]?.url ||
    activePreset.image ||
    HERO_VISUAL;

  // Handle Photo Selection
  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const rawFiles = Array.from(fileList);
    const remainingSlots = MAX_UPLOAD_PHOTOS - uploadedPhotos.length;

    if (remainingSlots <= 0) {
      setUploadError(`사진은 최대 ${MAX_UPLOAD_PHOTOS}장까지만 등록할 수 있습니다.`);
      return;
    }

    setIsProcessingUpload(true);
    setUploadError('');
    setUploadNotice('');

    const validItems: UploadedPhoto[] = [];
    const errors: string[] = [];
    const filesToProcess = rawFiles.slice(0, remainingSlots);

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      const check = validateImageFileBeforeUpload(file);
      if (!check.valid) {
        errors.push(check.errorMessage || `${file.name}: 지원하지 않는 파일 형식`);
        continue;
      }

      try {
        const processed = await processImageFileWithSpecs(file, 1200, 900, 0.78);
        const isPortrait = processed.outputHeight > processed.outputWidth;
        validItems.push({
          id: `upload-${Date.now()}-${i}`,
          url: processed.dataUrl,
          name: file.name || `현장사진_${uploadedPhotos.length + i + 1}.jpg`,
          specSummary: processed.specSummary,
          isPortrait,
        });
      } catch (err) {
        errors.push(err instanceof Error ? err.message : '사진 압축 변환 중 오류');
      }
    }

    setIsProcessingUpload(false);

    if (errors.length > 0) {
      setUploadError(errors[0]);
    }

    if (validItems.length > 0) {
      setUploadedPhotos((prev) => {
        const nextList = [...prev, ...validItems].slice(0, MAX_UPLOAD_PHOTOS);
        setActiveUploadedIndex(nextList.length - 1);
        return nextList;
      });

      const lastItem = validItems[validItems.length - 1];
      if (lastItem.isPortrait) {
        setFitContainMode(true);
      }

      setUploadNotice(
        `✓ 현장 사진 ${validItems.length}장 업로드 및 표준 최적화 완료 (${lastItem.specSummary})`
      );
    }
  };

  const handleRemoveUploadedPhoto = (photoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadedPhotos((prev) => {
      const next = prev.filter((p) => p.id !== photoId);
      setActiveUploadedIndex((currIdx) => Math.max(0, Math.min(currIdx, next.length - 1)));
      return next;
    });
    setUploadNotice('');
    setUploadError('');
  };

  const handleSelectPreset = (presetId: string) => {
    const found = SAMPLE_PHOTO_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setActivePresetId(presetId);
    setActiveCategory(found.category);
    setPyeong(found.defaultPyeong);
    setUploadNotice('');
  };

  // Convert Preset Image URL to Base64 for Server Processing if using preset
  const getSelectedPhotoBase64 = async (): Promise<string> => {
    if (currentUploadedPhoto?.url) {
      return currentUploadedPhoto.url;
    }
    // Fetch preset image and convert to data URL
    try {
      const response = await fetch(displayImage);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      // Fallback 1x1 png if local asset fetch fails
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    }
  };

  // Trigger Real Gemini AI Analysis via Server (Strict 1,000 KRW Ticket Verification)
  const handleStartRealAiAnalysis = async () => {
    // 1. 유료회원 로그인 및 이용권 검증 (미결제 시 AI 분석 및 견적 엔진 실행 절대 차단)
    if (!currentMember) {
      if (onOpenMemberModal) {
        onOpenMemberModal('profile');
      }
      return;
    }

    const activeTickets = getMemberActiveTickets(currentMember.id);
    if (!activeTickets || activeTickets.length === 0 || (currentMember.ticketBalance || 0) <= 0) {
      if (onOpenMemberModal) {
        onOpenMemberModal('tickets');
      }
      return;
    }

    const ticketToUse = activeTickets[0];

    setCurrentStep('analyzing');
    setAnalysisError('');
    setApiKeyNotice('');

    try {
      const imageBase64 = await getSelectedPhotoBase64();

      const response = await fetch('/api/estimate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64,
          category: activeCategory,
          pyeong,
          floor,
          hasElevator,
          additionalNotes,
          ticketToken: ticketToUse.token,
          ticketId: ticketToUse.ticketId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (data.paymentRequired) {
          if (onOpenMemberModal) {
            onOpenMemberModal('tickets');
          }
        }
        throw new Error(data.error || '견적 분석 중 오류가 발생했습니다.');
      }

      // 이용권 차감 처리
      await markTicketUsed(ticketToUse.ticketId, {
        category: activeCategory,
        pyeong,
      });

      if (onMemberUpdated && currentMember) {
        onMemberUpdated({
          ...currentMember,
          ticketBalance: Math.max(0, (currentMember.ticketBalance || 1) - 1),
        });
      }

      if (data.isApiKeyMissing) {
        setApiKeyNotice(data.message || 'API 키가 설정되지 않아 표준품셈 기준 계산이 적용되었습니다.');
      } else if (data.isCircuitBreakerActive) {
        setApiKeyNotice(data.message || '월간 시험 운영 예산 보호 모드가 적용되어 기본 표준품셈 기준 견적이 산출되었습니다.');
      }

      setAiAnalysis(data.aiAnalysis);
      setCalculationResult(data.calculationReport);

      // 회원 전용 견적 보관함에 영구 저장
      if (currentMember) {
        const storedId = `EST-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
        await saveEstimate({
          id: storedId,
          userId: currentMember.id,
          category: activeCategory,
          categoryLabel:
            SERVICES_DATA.find((s) => s.category === activeCategory)?.categoryLabel ||
            activeCategory,
          pyeong,
          floor,
          hasElevator,
          ticketId: ticketToUse.ticketId,
          totalEstimateMin: data.calculationReport?.priceRangeMin || 0,
          totalEstimateMax: data.calculationReport?.priceRangeMax || 0,
          supplyPriceMin: data.calculationReport?.supplyPriceMin || 0,
          supplyPriceMax: data.calculationReport?.supplyPriceMax || 0,
          vatMin: data.calculationReport?.vatMin || 0,
          vatMax: data.calculationReport?.vatMax || 0,
          damageSeverity: data.aiAnalysis?.damageSeverity || '보통',
          createdAt: Date.now(),
          analysisSummary: data.aiAnalysis?.surfaceCondition || '현장 상태 표준 분석 완료',
          rawAnalysisData: data.aiAnalysis,
          rawCalculationReport: data.calculationReport,
        });
      }

      setCurrentStep('result');
    } catch (err: unknown) {
      console.error('AI Analysis failed:', err);
      const errMsg = err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.';
      setAnalysisError(errMsg);
      setCurrentStep('input');
    }
  };

  const handleResetToInput = () => {
    setCurrentStep('input');
    setAnalysisError('');
  };

  return (
    <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-md sm:p-8">
      {/* Step Tracker Header */}
      <div className="border-b border-slate-100 pb-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-orange-600">
              <Sparkles className="h-4 w-4" />
              <span>실제 Gemini 3.8 Flash 비전 모델 연동</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-500">2026 정부 공인 건설공사 표준품셈 산정</span>
            </div>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              AI 사진 30초 정석 견적 산출기
            </h2>
          </div>

          {/* Stepper Indicator */}
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 ${
                currentStep === 'input'
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              1. 현장 사진 & 조건
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 ${
                currentStep === 'analyzing'
                  ? 'bg-orange-600 text-white animate-pulse'
                  : currentStep === 'result'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              2. AI 심층 분석 & 내역서
            </span>
          </div>
        </div>
      </div>

      {/* STEP 1 & 2: PHOTO UPLOAD & CONDITION INPUT */}
      {currentStep === 'input' && (
        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: Photo Uploader & Preview (6 cols) */}
          <div className="space-y-4 lg:col-span-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-900">
                1. 현장 사진 등록 (스마트폰 촬영 또는 앨범 선택)
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => cameraCaptureInputRef.current?.click()}
                  disabled={uploadedPhotos.length >= MAX_UPLOAD_PHOTOS || isProcessingUpload}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-orange-500 disabled:bg-slate-300 cursor-pointer"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  스마트폰 바로 촬영
                </button>
                <button
                  type="button"
                  onClick={() => albumInputRef.current?.click()}
                  disabled={uploadedPhotos.length >= MAX_UPLOAD_PHOTOS || isProcessingUpload}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300 cursor-pointer"
                >
                  <Images className="h-3.5 w-3.5 text-orange-400" />
                  사진 선택 ({uploadedPhotos.length}/{MAX_UPLOAD_PHOTOS})
                </button>
              </div>
            </div>

            {/* Hidden Inputs */}
            <input
              ref={cameraCaptureInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              capture="environment"
              onChange={(e) => {
                handleFilesSelected(e.target.files);
                e.target.value = '';
              }}
              className="hidden"
            />
            <input
              ref={albumInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              multiple
              onChange={(e) => {
                handleFilesSelected(e.target.files);
                e.target.value = '';
              }}
              className="hidden"
            />

            {/* Photo Viewer Frame */}
            <div
              onClick={() => albumInputRef.current?.click()}
              className="group relative aspect-4/3 w-full cursor-pointer overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-950 transition-colors hover:border-orange-500"
            >
              {!isCurrentBroken ? (
                <img
                  src={displayImage}
                  alt={currentUploadedPhoto?.name || activePreset.label}
                  referrerPolicy="no-referrer"
                  onError={() =>
                    setBrokenPhotoIds((prev) => ({ ...prev, [currentPhotoKey]: true }))
                  }
                  className={`h-full w-full ${
                    currentUploadedPhoto && fitContainMode
                      ? 'object-contain'
                      : 'object-cover group-hover:scale-[1.01]'
                  } transition-transform duration-200`}
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-slate-800 p-6 text-center text-white">
                  <Wrench className="h-8 w-8 text-orange-400" />
                  <p className="mt-2 text-sm font-semibold">사진 프리뷰</p>
                </div>
              )}

              {/* Scrim Overlay & Tag */}
              <div className="absolute top-3 right-3 left-3 flex items-center justify-between gap-2">
                <span className="truncate rounded bg-slate-950/85 px-2.5 py-1 text-xs font-semibold text-white">
                  {currentUploadedPhoto
                    ? `내 사진 (${activeUploadedIndex + 1}/${uploadedPhotos.length}): ${currentUploadedPhoto.name}`
                    : `샘플 사진: ${activePreset.label}`}
                </span>
                {currentUploadedPhoto && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFitContainMode((prev) => !prev);
                    }}
                    className="rounded bg-slate-900/90 px-2 py-0.5 text-[11px] font-semibold text-slate-200 hover:bg-slate-800 cursor-pointer"
                  >
                    {fitContainMode ? '꽉 차게 보기' : '세로 전체 보기'}
                  </button>
                )}
              </div>

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent p-3 text-white">
                <p className="text-xs font-medium">
                  클릭하거나 사진을 드래그하여 업로드하세요 (최대 10장 지원)
                </p>
              </div>
            </div>

            {uploadNotice && (
              <p className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                {uploadNotice}
              </p>
            )}
            {uploadError && (
              <p className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600">
                {uploadError}
              </p>
            )}

            {/* Thumbnails Strip */}
            {uploadedPhotos.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>업로드된 현장 사진 ({uploadedPhotos.length}장)</span>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedPhotos([]);
                      setActiveUploadedIndex(0);
                    }}
                    className="text-slate-400 hover:text-red-600 cursor-pointer"
                  >
                    전체 삭제
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-5 gap-2">
                  {uploadedPhotos.map((p, idx) => (
                    <div
                      key={p.id}
                      onClick={() => setActiveUploadedIndex(idx)}
                      className={`relative aspect-square cursor-pointer overflow-hidden rounded-lg border-2 ${
                        idx === activeUploadedIndex ? 'border-orange-600 ring-2 ring-orange-500/30' : 'border-slate-200'
                      }`}
                    >
                      <img src={p.url} alt={p.name} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => handleRemoveUploadedPhoto(p.id, e)}
                        className="absolute top-0.5 right-0.5 rounded bg-red-600/90 p-0.5 text-white hover:bg-red-700"
                        title="삭제"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sample Presets Selector */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-800">
                사진이 없으신가요? 실제 준공 현장 샘플로 테스트해 보세요:
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {SAMPLE_PHOTO_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`rounded-lg border p-2.5 text-left text-xs font-semibold transition-colors cursor-pointer ${
                      uploadedPhotos.length === 0 && activePresetId === preset.id
                        ? 'border-orange-600 bg-white text-orange-600 shadow-2xs ring-1 ring-orange-500/20'
                        : 'border-slate-200 bg-white/70 text-slate-700 hover:bg-white'
                    }`}
                  >
                    <p className="truncate">{preset.label}</p>
                    <p className="mt-0.5 font-mono-num text-[11px] text-slate-500">
                      {preset.defaultPyeong}평 기준
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Construction Category & Detailed Specs Input (6 cols) */}
          <div className="space-y-5 lg:col-span-6">
            {/* Category Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-900">
                2. 공사 유형 선택
              </label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {SERVICE_TABS.filter((t) => t.key !== 'all').map((tab) => {
                  const isSelected = activeCategory === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveCategory(tab.key)}
                      className={`rounded-lg border px-3 py-2 text-center text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'border-orange-600 bg-orange-600 text-white shadow-xs'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      {tab.label.split(' ')[0]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Area (Pyeong) Range Slider & Manual Input */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900">
                  3. 예상 시공 면적 (평수)
                </label>
                <div className="flex items-center gap-1 font-mono-num">
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={pyeong}
                    onChange={(e) => setPyeong(Math.max(1, Number(e.target.value)))}
                    className="w-16 rounded-md border border-slate-300 bg-white px-2 py-1 text-right text-sm font-bold text-orange-600 focus:border-orange-600 focus:outline-none"
                  />
                  <span className="text-xs font-semibold text-slate-600">평</span>
                  <span className="text-xs text-slate-400">
                    (약 {Math.round(pyeong * 3.3058)}㎡)
                  </span>
                </div>
              </div>

              <input
                type="range"
                min={3}
                max={100}
                value={pyeong}
                onChange={(e) => setPyeong(Number(e.target.value))}
                className="mt-3 h-2 w-full cursor-pointer accent-orange-600"
              />
              <div className="mt-1 flex justify-between font-mono-num text-[11px] text-slate-400">
                <span>3평 (부분보수/욕실)</span>
                <span>25평 (상가 표준)</span>
                <span>50평</span>
                <span>100평</span>
              </div>
            </div>

            {/* Floor & Elevator Conditions */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-900">
                  4. 현장 층수
                </label>
                <select
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-orange-600 focus:outline-none"
                >
                  <option value="1층">1층 (지상)</option>
                  <option value="2층">2층</option>
                  <option value="3층">3층</option>
                  <option value="4층 이상">4층 이상</option>
                  <option value="지하 1층">지하 1층</option>
                  <option value="지하 2층 이하">지하 2층 이하</option>
                  <option value="옥상/루프탑">옥상 / 루프탑</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900">
                  5. 화물/승객용 엘리베이터
                </label>
                <select
                  value={hasElevator ? 'yes' : 'no'}
                  onChange={(e) => setHasElevator(e.target.value === 'yes')}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-orange-600 focus:outline-none"
                >
                  <option value="yes">엘리베이터 이용 가능</option>
                  <option value="no">엘리베이터 없음 (사다리차/계단 양중)</option>
                </select>
              </div>
            </div>

            {/* Additional Note */}
            <div>
              <label className="block text-xs font-bold text-slate-900">
                6. 추가 요청사항 및 현장 특이점 (선택)
              </label>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="예: 야간 공사 희망, 주방 타일 밑 누수 의심, 폐기물 엘리베이터 보양 필수 등"
                rows={2}
                className="mt-1.5 w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800 focus:border-orange-600 focus:outline-none"
              />
            </div>

            {/* Standard Cost Assurance & 1,000 KRW Membership Status */}
            {currentMember && (currentMember.ticketBalance || 0) > 0 ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-slate-800">
                <div className="flex items-center justify-between font-bold text-emerald-900">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    {currentMember.name}님 (1,000원 유료회원)
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[11px] font-mono">
                    보유 AI 견적권: {currentMember.ticketBalance}장
                  </span>
                </div>
                <p className="mt-1 text-slate-600">
                  분석 시작 클릭 시 이용권 1장이 사용되며, Gemini AI 비전 분석과 건설공사 표준품셈 일위대가 내역서가 즉시 산출됩니다.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950 space-y-1">
                <div className="flex items-center justify-between font-bold text-amber-900">
                  <span className="flex items-center gap-1.5">
                    <Ticket className="w-4 h-4 text-orange-600" />
                    1,000원 유료회원 전용 정밀 AI 분석 시스템
                  </span>
                  <span className="px-2 py-0.5 bg-orange-600 text-white rounded text-[11px] font-bold">
                    1회 1,000원
                  </span>
                </div>
                <p className="text-slate-700">
                  건우 정석공사 AI 견적 서비스는 무분별한 서버 자원 낭비를 방지하고 실측 수준의 고정밀 분석을 위해 <strong>1,000원 유료 이용권</strong>으로 운영됩니다.
                </p>
                <p className="text-slate-500 text-[11px]">
                  * 유료회원은 생활관리용품 전 품목 최대 26% 평생 할인 및 1년 무상 A/S가 보장됩니다.
                </p>
              </div>
            )}

            {/* Error Banner */}
            {analysisError && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-center justify-between">
                <span>{analysisError}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (!currentMember) onOpenMemberModal?.('profile');
                    else onOpenMemberModal?.('tickets');
                  }}
                  className="px-2.5 py-1 bg-red-600 text-white font-bold rounded text-[11px] ml-2 shrink-0"
                >
                  이용권 충전/확인
                </button>
              </div>
            )}

            {/* CTA Button */}
            {currentMember && (currentMember.ticketBalance || 0) > 0 ? (
              <button
                type="button"
                onClick={handleStartRealAiAnalysis}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 py-4 text-base font-bold text-white shadow-lg shadow-orange-600/25 transition-all hover:bg-orange-500 cursor-pointer"
              >
                <Sparkles className="h-5 w-5" />
                <span>1,000원 이용권 사용 & Gemini AI 정밀 견적 시작 (잔여: {currentMember.ticketBalance}장)</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (!currentMember) {
                    onOpenMemberModal?.('profile');
                  } else {
                    onOpenMemberModal?.('tickets');
                  }
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-4 text-base font-bold text-white shadow-lg hover:bg-orange-600 transition-all cursor-pointer"
              >
                <Ticket className="h-5 w-5 text-orange-400" />
                <span>
                  {!currentMember
                    ? '1,000원 유료회원 로그인 / 가입 후 AI 견적받기'
                    : '1,000원 AI 견적 이용권 결제하기'}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: ANALYZING STATE (REAL API CALL) */}
      {currentStep === 'analyzing' && (
        <div className="my-12 flex flex-col items-center justify-center p-8 text-center">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 ring-8 ring-orange-100">
            <RefreshCw className="h-10 w-10 animate-spin" />
            <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-amber-500" />
          </div>

          <h3 className="mt-6 text-xl font-bold text-slate-900">
            서버 측 Gemini 3.8 Flash가 현장 사진을 정밀 분석하고 있습니다
          </h3>
          <p className="mt-2 max-w-md text-sm text-slate-600">
            사진 속 마감재 종류, 파손 부위, 철거 대상물, 폐기물 물량을 식별하고 건설공사 표준품셈 일위대가 기준을 매핑하고 있습니다. 잠시만 기다려 주세요...
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1">
              ✓ 이미지 포맷 및 해상도 최적화 검증
            </span>
            <span className="flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1">
              ✓ 표준품셈 공종 코드 대조
            </span>
            <span className="flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1">
              ✓ 2026 건설노임단가 연산
            </span>
          </div>
        </div>
      )}

      {/* STEP 4: VERIFIABLE ESTIMATE RESULT REPORT */}
      {currentStep === 'result' && calculationResult && (
        <div className="mt-6 space-y-6">
          {/* API Key or Error Warning Banner */}
          {apiKeyNotice && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">
              <div className="flex items-center gap-2 font-bold">
                <Info className="h-4 w-4 text-amber-600" />
                <span>{apiKeyNotice}</span>
              </div>
            </div>
          )}
          {analysisError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span>{analysisError}</span>
              </div>
            </div>
          )}

          {/* Top Result Banner */}
          <div className="flex flex-col justify-between gap-4 rounded-xl bg-slate-950 p-6 text-white md:flex-row md:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-orange-400">
                <span>표준품셈 적용 공식 산출서</span>
                <span aria-hidden="true">·</span>
                <span>{calculationResult.categoryLabel}</span>
                <span aria-hidden="true">·</span>
                <span>{pyeong}평 ({calculationResult.squareMeters}㎡)</span>
                <span aria-hidden="true">·</span>
                <span>{floor} ({hasElevator ? '엘리베이터 보유' : '엘리베이터 없음'})</span>
              </div>
              <h3 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                예상 견적: {Math.round(calculationResult.priceRangeMin / 10000).toLocaleString()}만 원 ~{' '}
                <span className="text-orange-400">
                  {Math.round(calculationResult.priceRangeMax / 10000).toLocaleString()}만 원
                </span>
                <span className="ml-2 text-xs font-semibold text-orange-300">({calculationResult.priceRangeBasis})</span>
              </h3>
              <p className="mt-1 text-xs text-slate-300">
                * 부가가치세(VAT 10%) 포함 시: 약 {Math.round(calculationResult.priceRangeWithVatMin / 10000).toLocaleString()}만 원 ~ {Math.round(calculationResult.priceRangeWithVatMax / 10000).toLocaleString()}만 원 ({calculationResult.priceRangeWithVatBasis})
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                * 확정 공사비는 현장 무료 방문 실측 후 최종 확정되며, 위 내역은 2026 표준품셈 및 노임단가 기반 사전 예비 견적입니다.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleResetToInput}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5 text-orange-400" />
                다른 조건/사진으로 재분석
              </button>
              <button
                type="button"
                onClick={() => onOpenCalculator(calculationResult.category, pyeong)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer"
              >
                <Calculator className="h-3.5 w-3.5 text-orange-400" />
                셀프 계산기에서 수정
              </button>
            </div>
          </div>

          {/* AI Visual Findings Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Box 1: AI Detected Site Condition & Work Elements */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="flex items-center gap-1.5 text-xs font-bold text-orange-600">
                <Camera className="h-4 w-4" />
                AI 사진 육안 판독 결과
              </p>
              <p className="mt-2 text-sm font-bold text-slate-900">
                {aiAnalysis?.surfaceCondition || '현장 상태 식별 완료'}
              </p>
              <p className="mt-1 font-mono-num text-xs text-slate-500">
                작업 난이도: <strong className="text-slate-800">{aiAnalysis?.damageSeverity || '보통'}</strong> · 예상 폐기물: <strong className="text-slate-800">{aiAnalysis?.wasteTonsEstimated || `${calculationResult.waste.estimatedTons}톤`}</strong>
              </p>

              <div className="mt-3 border-t border-slate-200 pt-3">
                <p className="text-xs font-semibold text-slate-700">식별된 시공/철거 대상 요소:</p>
                <ul className="mt-1.5 space-y-1 text-xs text-slate-600">
                  {(aiAnalysis?.detectedElements || [
                    '바닥 및 벽체 철거 부위',
                    '폐기물 적재 및 반출 동선',
                    '현장 가설 및 보양 대상',
                  ]).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Box 2: Recommended Pumsem Scope */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                <FileCheck2 className="h-4 w-4 text-emerald-600" />
                국토교통부 표준품셈 권장 시공 공정
              </p>
              <p className="mt-1 text-xs text-slate-500">
                적용 기준: {calculationResult.pumsemStandardChapter}
              </p>

              <ul className="mt-3 space-y-2 text-xs text-slate-700">
                {(aiAnalysis?.recommendedScope || [
                  '바탕면 레이턴스 연삭 및 청소',
                  '표준품셈 규격 자재 반입 및 정밀 시공',
                  '폐기물 올바로 시스템 적법 반출',
                ]).map((scope, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-800">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-slate-800">{scope}</span>
                  </li>
                ))}
              </ul>

              {aiAnalysis?.siteKeyRisk && (
                <div className="mt-3 rounded-lg border border-orange-200 bg-white p-2.5 text-xs text-orange-900">
                  <strong className="font-semibold text-orange-700">엔지니어 핵심 조언:</strong>{' '}
                  {aiAnalysis.siteKeyRisk}
                </div>
              )}
            </div>
          </div>

          {/* CRITICAL: UNCERTAIN ITEMS REQUIRING ONSITE INSPECTION */}
          <div className="rounded-xl border-2 border-amber-300 bg-amber-50/70 p-5 text-slate-900">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-bold text-slate-900">
                  [필독] 사진만으로 알 수 없어 무료 방문 실측 시 확인해야 하는 불확실 항목
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-700">
                  건축 시공 특성상 사진 겉면만으로는 내부 구조, 침투 깊이, 매립 상태를 단정할 수 없습니다. 정석공사는 덤터기 추가금을 방지하기 위해 아래 항목을 착공 전 현장에서 정밀 계측합니다.
                </p>

                <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {(aiAnalysis?.uncertainItems || [
                    '슬래브 및 바닥 몰탈층 두께 (레이저 레벨기 계측 필수)',
                    '하부 방수층 누수 침투 심도 (수분 측정기 검사)',
                    '벽체/바닥 내부 매립 배관 노후도 (수압 기밀 테스트)',
                    '건물 관리실 엘리베이터 보양 기준 및 반출 시간대 제한',
                  ]).map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-2 rounded-lg border border-amber-200 bg-white/80 px-3 py-2 text-xs font-semibold text-amber-900"
                    >
                      <span className="text-amber-600">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Itemized Pumsem Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
              <p className="text-xs font-bold text-slate-900">
                표준품셈 및 시중노임단가 기반 산출 내역서 (공식 기준 vs 자체 설정단가 투명 분리)
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 pl-5 pr-2">공사 항목</th>
                    <th className="py-2.5 px-2">단가 구분</th>
                    <th className="py-2.5 px-2">산출 근거</th>
                    <th className="py-2.5 px-2 text-center">수량</th>
                    <th className="py-2.5 px-2 text-right">적용 단가</th>
                    <th className="py-2.5 pr-5 pl-2 text-right">금액</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {calculationResult.itemizedItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="py-3 pl-5 pr-2 font-semibold text-slate-900">{item.name}</td>
                      <td className="py-3 px-2">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ${
                            item.sourceType === '공식 표준품셈 기준'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {item.sourceType}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-slate-500 text-[11px] leading-tight">{item.basis}</td>
                      <td className="py-3 px-2 text-center font-mono-num text-slate-700 whitespace-nowrap">{item.quantity}</td>
                      <td className="py-3 px-2 text-right font-mono-num text-slate-600 whitespace-nowrap">{item.unitPrice}</td>
                      <td className="py-3 pr-5 pl-2 text-right font-mono-num font-bold text-slate-900 whitespace-nowrap">
                        {item.amount.toLocaleString('ko-KR')}원
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-200 bg-slate-50/80 font-bold">
                  <tr>
                    <td colSpan={5} className="py-3 pl-5 text-right text-slate-700">
                      공급가액 (소계, VAT 별도)
                    </td>
                    <td className="py-3 pr-5 text-right font-mono-num text-sm text-slate-900">
                      {calculationResult.subtotal.toLocaleString('ko-KR')}원
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="py-2 pl-5 text-right text-xs font-normal text-slate-500">
                      부가가치세 (VAT 10%)
                    </td>
                    <td className="py-2 pr-5 text-right font-mono-num text-xs font-normal text-slate-600">
                      {calculationResult.vat.toLocaleString('ko-KR')}원
                    </td>
                  </tr>
                  <tr className="border-t border-slate-200 text-sm">
                    <td colSpan={5} className="py-3.5 pl-5 text-right text-orange-600">
                      합계금액 (VAT 포함)
                    </td>
                    <td className="py-3.5 pr-5 text-right font-mono-num text-base font-extrabold text-orange-600">
                      {calculationResult.totalWithVat.toLocaleString('ko-KR')}원
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href={`tel:${DIRECT_PHONE}`}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-slate-800 bg-slate-900 px-6 py-4 text-sm font-bold text-white transition-colors hover:bg-slate-800 whitespace-nowrap"
            >
              <Phone className="h-4 w-4 text-orange-400" />
              <span>24시 직통 엔지니어 상담 ({DIRECT_PHONE})</span>
            </a>

            <button
              type="button"
              onClick={() =>
                onOpenConsultation(
                  `[실제 Gemini AI 사진 견적 결과 연동]\n• 공종: ${calculationResult.categoryLabel}\n• 면적: ${pyeong}평 (${calculationResult.squareMeters}㎡) / ${floor} / EL ${hasElevator ? '유' : '무'}\n• AI 판독 상태: ${aiAnalysis?.surfaceCondition || '식별 완료'}\n• 표준품셈 노무: 기능공 ${calculationResult.labor.skilledLaborManDays}품 + 보통인부 ${calculationResult.labor.generalLaborManDays}품\n• 예상 견적 범위: ${Math.round(calculationResult.priceRangeMin / 10000)}만 ~ ${Math.round(calculationResult.priceRangeMax / 10000)}만 원\n• 실측 필수 점검 항목: ${(aiAnalysis?.uncertainItems || []).join(', ')}`,
                  calculationResult.categoryLabel
                )
              }
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-orange-600/25 transition-all hover:bg-orange-500 whitespace-nowrap cursor-pointer"
            >
              <span>이 AI 분석 내역으로 무료 방문실측 및 확정 견적서 신청</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
