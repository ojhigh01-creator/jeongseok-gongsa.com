import React, { useState, useRef, useMemo } from 'react';
import {
  Camera,
  Upload,
  CheckCircle,
  ArrowRight,
  Calculator,
  RefreshCw,
  Wrench,
  FileCheck2,
  Ruler,
  AlertTriangle,
  Plus,
  Trash2,
  Sparkles,
  Smartphone,
  Images,
  Info,
} from 'lucide-react';
import {
  SAMPLE_PHOTO_PRESETS,
  SERVICES_DATA,
  ServiceCategoryKey,
  ServiceItem,
  HERO_VISUAL,
} from '../data/constructionData';
import {
  processImageFileWithSpecs,
  validateImageFileBeforeUpload,
  PHOTO_UPLOAD_SPECS,
} from '../utils/galleryStorage';

interface UploadedPhoto {
  id: string;
  url: string;
  name: string;
  specSummary: string;
  isPortrait: boolean;
}

interface CustomWorkPreset {
  workTitle: string;
  sizeSpec: string;
  defaultPyeong: number;
  pumsemChapter: string;
  pumsemBasis: string;
}

const CUSTOM_WORK_EXAMPLES: CustomWorkPreset[] = [
  {
    workTitle: '아스팔트 싱글 지붕 강풍 파손 보수 및 방수시트 재시공',
    sizeSpec: '지붕 경사면 가로 6.5m × 세로 4.2m (약 8.5평), 용마루 6.5m',
    defaultPyeong: 9,
    pumsemChapter: '건설공사 표준품셈 건축부문 제11장 (지붕 및 홈통공사 - 아스팔트 싱글 잇기)',
    pumsemBasis: '방수시트 바탕 깔기 + 아스팔트 싱글 잇기(지붕공 0.18품/㎡) 및 자재 할증 5% 적용',
  },
  {
    workTitle: '콘크리트 블럭 담장 균열 철거 및 조적·미장 재시공',
    sizeSpec: '담장 연장 길이 14m × 높이 1.8m (6인치 시멘트 블럭 조적 및 양면 몰탈 미장)',
    defaultPyeong: 8,
    pumsemChapter: '건설공사 표준품셈 건축부문 제4장 (조적공사 - 시멘트블록 쌓기) · 제8장 (미장공사)',
    pumsemBasis: '기초 줄파기 + 6인치 블록 쌓기(조적공 0.16품/㎡) + 양면 시멘트 모르타르 바름(미장공 0.14품/㎡) 및 블록 할증 4% 적용',
  },
  {
    workTitle: '상가 출입구 노후 계단 파손 보수 및 논슬립·화강석 타일 재시공',
    sizeSpec: '계단 폭 2.4m × 디딤판 12단 (챌판 포함), 황동 논슬립 바 시공',
    defaultPyeong: 6,
    pumsemChapter: '건설공사 표준품셈 건축부문 제5장 (석공사) · 제10장 (타일공사) · 제7장 (금속 논슬립)',
    pumsemBasis: '계단 디딤판·챌판 석재/타일 붙임(석공·타일공 0.25품/㎡) 및 논슬립 매립 품셈 적용',
  },
];

const MAX_UPLOAD_PHOTOS = 10;

interface AiEstimateSimulatorProps {
  selectedCategoryFromService?: ServiceCategoryKey;
  servicesList?: ServiceItem[];
  onOpenCalculator: (category: ServiceCategoryKey, pyeong: number) => void;
  onOpenConsultation: (summary: string, categoryLabel: string) => void;
}

export const AiEstimateSimulator: React.FC<AiEstimateSimulatorProps> = ({
  selectedCategoryFromService,
  servicesList = SERVICES_DATA,
  onOpenCalculator,
  onOpenConsultation,
}) => {
  const [activePresetId, setActivePresetId] = useState<string>(SAMPLE_PHOTO_PRESETS[0].id);
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const [activeUploadedIndex, setActiveUploadedIndex] = useState<number>(0);
  const [uploadNotice, setUploadNotice] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');
  const [isProcessingUpload, setIsProcessingUpload] = useState<boolean>(false);

  // Custom user work description & real size input
  const [customWorkInput, setCustomWorkInput] = useState<string>('');
  const [customSizeInput, setCustomSizeInput] = useState<string>('');
  const [customPumsemOverride, setCustomPumsemOverride] = useState<{
    chapter: string;
    basis: string;
  } | null>(null);
  const [isCustomWorkApplied, setIsCustomWorkApplied] = useState<boolean>(false);

  const [pyeong, setPyeong] = useState<number>(SAMPLE_PHOTO_PRESETS[0].defaultPyeong);
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'completed'>('completed');
  const [scanProgress, setScanProgress] = useState<number>(100);
  const [brokenPhotoIds, setBrokenPhotoIds] = useState<Record<string, boolean>>({});
  const [fitContainMode, setFitContainMode] = useState<boolean>(false);

  // Separate refs for Album multi-select vs Smartphone direct rear camera capture
  const albumInputRef = useRef<HTMLInputElement | null>(null);
  const cameraCaptureInputRef = useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (selectedCategoryFromService && selectedCategoryFromService !== 'all') {
      const matchedPreset =
        SAMPLE_PHOTO_PRESETS.find((p) => p.category === selectedCategoryFromService) ||
        SAMPLE_PHOTO_PRESETS[0];
      setActivePresetId(matchedPreset.id);
      setIsCustomWorkApplied(false);
      setCustomPumsemOverride(null);
      setPyeong(matchedPreset.defaultPyeong);
      triggerAiScan();
    }
  }, [selectedCategoryFromService]);

  const activePreset = useMemo(
    () => SAMPLE_PHOTO_PRESETS.find((p) => p.id === activePresetId) || SAMPLE_PHOTO_PRESETS[0],
    [activePresetId]
  );

  const matchedService = useMemo(
    () =>
      servicesList.find((s) => s.category === activePreset.category) ||
      servicesList[0] ||
      SERVICES_DATA[0],
    [activePreset, servicesList]
  );

  // 건설공사 표준품셈 (국토교통부/건설부 제정 기준) 및 대한건설협회 시중노임단가 기반 산출
  const estimatedReport = useMemo(() => {
    const scaleFactor = pyeong / 10;
    const skilledPum = Number(
      (matchedService.pumsem.skilledLaborPer10Pyeong * scaleFactor).toFixed(1)
    );
    const generalPum = Number(
      (matchedService.pumsem.generalLaborPer10Pyeong * scaleFactor).toFixed(1)
    );
    const totalPum = Number((skilledPum + generalPum).toFixed(1));

    const baseTotal = matchedService.minFlatCost + pyeong * matchedService.basePricePerPyeong;
    const minPrice = Math.round(baseTotal * 0.96);
    const maxPrice = Math.round(baseTotal * 1.08);
    const materialCost = Math.round(
      baseTotal * 0.42 * (1 + matchedService.pumsem.materialAllowancePct / 100)
    );
    const laborCost = Math.round(baseTotal * 0.4);
    const wasteAndEquipCost = Math.max(20, baseTotal - Math.round(baseTotal * 0.42) - laborCost);

    const appliedChapter =
      isCustomWorkApplied && customPumsemOverride
        ? customPumsemOverride.chapter
        : isCustomWorkApplied
        ? '건설공사 표준품셈 건축·토목·설비 해당 공종 일위대가 및 시중노임단가 복합 적용'
        : matchedService.pumsem.chapterCode;

    const appliedBasis =
      isCustomWorkApplied && customPumsemOverride
        ? customPumsemOverride.basis
        : isCustomWorkApplied
        ? `고객 입력 공정(${customWorkInput}) 및 실측 치수(${
            customSizeInput || `${pyeong}평 환산`
          }) 기준 기능공·보통인부 표준 품수 산정`
        : matchedService.pumsem.basisDescription;

    return {
      minPrice,
      maxPrice,
      materialCost,
      laborCost,
      wasteAndEquipCost,
      skilledPum,
      generalPum,
      totalPum,
      appliedChapter,
      appliedBasis,
    };
  }, [
    matchedService,
    pyeong,
    isCustomWorkApplied,
    customPumsemOverride,
    customWorkInput,
    customSizeInput,
  ]);

  const triggerAiScan = () => {
    setScanState('scanning');
    setScanProgress(18);
    const t1 = setTimeout(() => setScanProgress(56), 250);
    const t2 = setTimeout(() => setScanProgress(89), 550);
    const t3 = setTimeout(() => {
      setScanProgress(100);
      setScanState('completed');
    }, 900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  };

  const handleSelectPreset = (presetId: string) => {
    const found = SAMPLE_PHOTO_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setActivePresetId(presetId);
    setIsCustomWorkApplied(false);
    setCustomPumsemOverride(null);
    setPyeong(found.defaultPyeong);
    triggerAiScan();
  };

  const handleApplyCustomExample = (example: CustomWorkPreset) => {
    setCustomWorkInput(example.workTitle);
    setCustomSizeInput(example.sizeSpec);
    setCustomPumsemOverride({
      chapter: example.pumsemChapter,
      basis: example.pumsemBasis,
    });
    setPyeong(example.defaultPyeong);
    setIsCustomWorkApplied(true);
    triggerAiScan();
  };

  const handleApplyUserCustomInput = () => {
    if (!customWorkInput.trim()) return;
    setCustomPumsemOverride(null);
    setIsCustomWorkApplied(true);
    triggerAiScan();
  };

  /**
   * 스마트폰 카메라 촬영본(HEIC/고화소 JPG/빈 MIME 타입) 및 앨범 다중 선택 사진을
   * 메모리 크래시나 회전 오류 없이 안전하게 변환하여 등록합니다.
   */
  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const rawFiles = Array.from(fileList);
    const remainingSlots = MAX_UPLOAD_PHOTOS - uploadedPhotos.length;

    if (remainingSlots <= 0) {
      setUploadError(`사진은 최대 ${MAX_UPLOAD_PHOTOS}장까지만 업로드할 수 있습니다.`);
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
        errors.push(check.errorMessage || `${file.name}: 지원하지 않는 파일`);
        continue;
      }

      try {
        const processed = await processImageFileWithSpecs(file, 1200, 900, 0.78);
        const isPortrait = processed.outputHeight > processed.outputWidth;
        validItems.push({
          id: `upload-${Date.now()}-${i}`,
          url: processed.dataUrl,
          name: file.name || `스마트폰_현장사진_${uploadedPhotos.length + i + 1}.jpg`,
          specSummary: processed.specSummary,
          isPortrait,
        });
      } catch (err) {
        errors.push(
          err instanceof Error
            ? err.message
            : '사진 처리 중 일시적 오류가 발생했습니다.'
        );
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

      if (rawFiles.length > remainingSlots) {
        setUploadNotice(
          `최대 ${MAX_UPLOAD_PHOTOS}장 제한으로 인해 ${validItems.length}장이 추가되었습니다. (${lastItem.specSummary})`
        );
      } else {
        setUploadNotice(
          `✓ 스마트폰/PC 현장 사진 ${validItems.length}장 최적화 업로드 완료 (${lastItem.specSummary})`
        );
      }

      triggerAiScan();
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

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFilesSelected(e.dataTransfer.files);
  };

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

  const reportTitle =
    isCustomWorkApplied && customWorkInput.trim()
      ? `${customWorkInput.trim()} (${customSizeInput.trim() || `${pyeong}평 기준`})`
      : currentUploadedPhoto
      ? `고객 업로드 현장 사진 (${uploadedPhotos.length}장 · ${pyeong}평 기준)`
      : activePreset.label;

  return (
    <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12">
      {/* Left 6 cols: Smartphone Camera Capture + Sample Presets + Custom Work Input */}
      <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xs lg:col-span-6">
        <div>
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold text-orange-600">
                AI 사진 30초 견적 · 스마트폰 촬영 및 앨범 업로드 완벽 지원
              </p>
              <h2 className="mt-0.5 text-lg font-bold text-slate-900">
                현장 사진 업로드 (최대 10장) 및 희망 공사 입력
              </h2>
            </div>

            {/* Dual Upload Buttons for Smartphone Users (Direct Camera vs Photo Album) */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => cameraCaptureInputRef.current?.click()}
                disabled={uploadedPhotos.length >= MAX_UPLOAD_PHOTOS || isProcessingUpload}
                className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-xs font-bold text-white shadow-2xs transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-slate-400 whitespace-nowrap cursor-pointer"
              >
                <Smartphone className="h-3.5 w-3.5" />
                스마트폰 바로 촬영
              </button>
              <button
                type="button"
                onClick={() => albumInputRef.current?.click()}
                disabled={uploadedPhotos.length >= MAX_UPLOAD_PHOTOS || isProcessingUpload}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 whitespace-nowrap cursor-pointer"
              >
                <Images className="h-3.5 w-3.5 text-orange-400" />
                사진첩/PC 선택 ({uploadedPhotos.length}/{MAX_UPLOAD_PHOTOS})
              </button>
            </div>

            {/* Hidden Input 1: Direct Smartphone Rear Camera Capture */}
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

            {/* Hidden Input 2: Multi-Photo Album / PC File Picker (JPG/PNG/WEBP) */}
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
          </div>

          {/* Uploadable Photo Size & Smartphone Compatibility Guide Bar */}
          <div className="mt-3 flex flex-col gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <Info className="h-3.5 w-3.5 text-orange-600 shrink-0" />
                <span>
                  <strong>업로드 가능 사진 규격:</strong> 권장 1200×900px ({PHOTO_UPLOAD_SPECS.supportedFormatsLabel}) ·{' '}
                  <strong className="text-orange-700">1장당 최대 {PHOTO_UPLOAD_SPECS.maxFileSizeMB}MB 이하</strong>
                </span>
              </span>
              <span className="font-mono-num text-[10px] text-slate-500">
                평균 200~350KB 자동 경량화
              </span>
            </div>
            <p className="text-[11px] font-medium text-amber-800">
              ※ {PHOTO_UPLOAD_SPECS.heicGuideText}
            </p>
          </div>

          {/* 4 Sample Presets */}
          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-700">
              실제 시공 현장 샘플로 즉시 30초 견적 테스트하기:
            </p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SAMPLE_PHOTO_PRESETS.map((preset) => {
                const isActive =
                  !isCustomWorkApplied &&
                  uploadedPhotos.length === 0 &&
                  activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-colors cursor-pointer ${
                      isActive
                        ? 'border-orange-600 bg-orange-50/70 text-slate-900'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <span className="truncate">{preset.label}</span>
                    <span className="ml-2 shrink-0 font-mono-num text-[11px] text-orange-600">
                      선택
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Free-Form Construction Work & Actual Size Input Box */}
          <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="custom-work-input"
                className="flex items-center gap-1.5 text-xs font-bold text-slate-900"
              >
                <Sparkles className="h-3.5 w-3.5 text-orange-600" />
                위 4가지 외 원하는 공사를 자유롭게 입력해 보세요 (자유 공종·보수 견적)
              </label>
              {isCustomWorkApplied && (
                <span className="text-[11px] font-bold text-orange-600">
                  ✓ 자유 입력 공종 품셈 반영됨
                </span>
              )}
            </div>

            {/* Quick Example Buttons */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-500">예시 클릭:</span>
              {CUSTOM_WORK_EXAMPLES.map((ex, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyCustomExample(ex)}
                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition-colors hover:border-orange-500 hover:text-orange-600 cursor-pointer"
                >
                  {ex.workTitle.split(' ')[0]} {ex.workTitle.split(' ')[1]}{' '}
                  {ex.workTitle.split(' ')[2]}
                </button>
              ))}
            </div>

            <div className="mt-2.5 space-y-2">
              <input
                id="custom-work-input"
                type="text"
                value={customWorkInput}
                onChange={(e) => setCustomWorkInput(e.target.value)}
                placeholder="예: 아스팔트 싱글 지붕 보수, 콘크리트 블럭 담장 재시공, 상가 계단 타일 보수 등"
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-orange-600 focus:outline-none"
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Ruler className="pointer-events-none absolute top-2.5 left-3 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={customSizeInput}
                    onChange={(e) => setCustomSizeInput(e.target.value)}
                    placeholder="실측 사이즈 기재 (예: 가로 12m × 높이 1.8m, 또는 면적 약 8평)"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-8 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-orange-600 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyUserCustomInput}
                  className="rounded-lg bg-orange-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-orange-500 whitespace-nowrap cursor-pointer"
                >
                  자유 입력 공종으로 30초 견적 산출
                </button>
              </div>
            </div>
          </div>

          {/* Mandatory Photo Shooting & Actual Size Precaution Box */}
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50/80 p-3.5 text-xs text-slate-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="space-y-1 leading-relaxed">
                <p className="font-bold text-slate-900">
                  [필독] 스마트폰 현장 촬영 및 정확한 AI 표준품셈 물량 산출 안내
                </p>
                <p className="text-slate-700">
                  1. <strong className="font-semibold text-slate-900">크기 가늠용 표준대비물품 동시 촬영:</strong>{' '}
                  시공대상물의 면적·길이·높이를 정확히 판독할 수 있도록{' '}
                  <span className="font-semibold text-orange-700 underline underline-offset-2">
                    줄자, 500ml 생수병, A4 용지, 성인 신발, 신용카드 등 크기를 비교할 수 있는 표준대비상품
                  </span>
                  을 대상물 옆에 두고 함께 촬영해 주세요. (최대 10장 업로드 가능)
                </p>
                <p className="text-slate-700">
                  2. <strong className="font-semibold text-slate-900">지원 사진 형식 ({PHOTO_UPLOAD_SPECS.supportedFormatsLabel}):</strong>{' '}
                  {PHOTO_UPLOAD_SPECS.heicGuideText}
                </p>
              </div>
            </div>
          </div>

          {/* Multi-Photo Upload & Preview Box (Up to 10 Photos) */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => albumInputRef.current?.click()}
            className="group relative mt-4 cursor-pointer overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-900 transition-colors hover:border-orange-500"
          >
            <div className="relative aspect-16/9 w-full overflow-hidden bg-slate-950">
              {!isCurrentBroken ? (
                <img
                  src={displayImage}
                  alt={currentUploadedPhoto?.name || activePreset.label}
                  referrerPolicy="no-referrer"
                  onError={() =>
                    setBrokenPhotoIds((prev) => ({ ...prev, [currentPhotoKey]: true }))
                  }
                  className={`h-full w-full transition-transform duration-200 ${
                    currentUploadedPhoto && fitContainMode
                      ? 'object-contain'
                      : 'object-cover group-hover:scale-[1.01]'
                  }`}
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-slate-800 p-6 text-center text-white">
                  <Wrench className="h-8 w-8 text-orange-400" />
                  <p className="mt-2 text-sm font-semibold">{reportTitle}</p>
                  <p className="mt-1 text-xs text-slate-300">
                    정석공사 현장 분석 이미지 프리뷰
                  </p>
                </div>
              )}

              {/* Top Indicator */}
              <div className=" absolute top-3 right-3 left-3 flex flex-wrap items-center justify-between gap-2">
                <span className="pointer-events-none truncate rounded bg-slate-950/85 px-3 py-1.5 text-xs font-semibold text-white">
                  {currentUploadedPhoto
                    ? `업로드 사진 (${activeUploadedIndex + 1}/${uploadedPhotos.length}): ${currentUploadedPhoto.name}`
                    : `분석 샘플: ${activePreset.label}`}
                </span>
                <div className="flex items-center gap-1.5">
                  {currentUploadedPhoto && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFitContainMode((prev) => !prev);
                      }}
                      className="rounded bg-slate-900/90 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-800 cursor-pointer"
                    >
                      {fitContainMode ? '화면 꽉 차게 보기' : '세로 사진 전체 보기'}
                    </button>
                  )}
                  <span className="pointer-events-none shrink-0 rounded bg-orange-600/95 px-2.5 py-1 font-mono-num text-xs font-bold text-white">
                    최대 {MAX_UPLOAD_PHOTOS}장 · 장당 20MB
                  </span>
                </div>
              </div>

              {/* Processing or AI Scanning Compositor Overlay */}
              {(isProcessingUpload || scanState === 'scanning') && (
                <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-[2px]">
                  <div className="animate-ai-scan h-1 w-full bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.95)]" />
                  <div className="flex h-full flex-col items-center justify-center p-4 text-center text-white">
                    <RefreshCw className="h-7 w-7 animate-spin text-orange-400" />
                    <p className="mt-2 text-sm font-bold">
                      {isProcessingUpload
                        ? '스마트폰 촬영 사진 자동 방향 보정 및 용량 최적화 중...'
                        : `건설부 표준품셈 기반 AI 물량·사이즈 분석 중... (${scanProgress}%)`}
                    </p>
                    <p className="mt-1 text-xs text-slate-300">
                      표준대비물품 스케일 대조 · 기능공/보통인부 품수 · 자재 할증률 계산 중
                    </p>
                  </div>
                </div>
              )}

              {/* Bottom Scrim with Drag & Drop Prompt */}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-slate-950/90 via-slate-950/65 to-transparent px-4 py-3 text-white">
                <div className="flex items-center gap-2 text-xs">
                  <Upload className="h-4 w-4 text-orange-400 shrink-0" />
                  <span className="truncate">
                    스마트폰 촬영 사진 또는 앨범 사진(최대 10장)을 터치하여 추가하세요
                  </span>
                </div>
                <span className="ml-2 shrink-0 text-xs font-semibold text-orange-400 underline">
                  + 사진 추가
                </span>
              </div>
            </div>
          </div>

          {uploadNotice && (
            <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              {uploadNotice}
            </p>
          )}
          {uploadError && (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600">
              {uploadError}
            </p>
          )}

          {/* Uploaded Photos Thumbnail Strip (1 ~ 10 Slots) */}
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">
                견적 요청 업로드 사진 목록 ({uploadedPhotos.length} / {MAX_UPLOAD_PHOTOS}장)
              </span>
              {uploadedPhotos.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setUploadedPhotos([]);
                    setActiveUploadedIndex(0);
                    setUploadNotice('');
                    setUploadError('');
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-red-600 cursor-pointer"
                >
                  전체 삭제
                </button>
              )}
            </div>

            {uploadedPhotos.length === 0 ? (
              <p className="mt-1.5 text-xs text-slate-500">
                상단 <strong>[스마트폰 바로 촬영]</strong> 또는 <strong>[사진첩/PC 선택]</strong> 버튼을 눌러 현장 사진을 올려주세요. (전체 전경, 근접 부위, 줄자/생수병 대비 사진 등 최대 10장)
              </p>
            ) : (
              <div className="mt-2.5 grid grid-cols-5 gap-2 sm:grid-cols-10">
                {uploadedPhotos.map((photo, idx) => {
                  const isCurrent = idx === activeUploadedIndex;
                  return (
                    <div
                      key={photo.id}
                      onClick={() => setActiveUploadedIndex(idx)}
                      className={`group relative aspect-square cursor-pointer overflow-hidden rounded-md border-2 ${
                        isCurrent ? 'border-orange-600' : 'border-slate-200'
                      }`}
                    >
                      <img
                        src={photo.url}
                        alt={photo.name}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute bottom-0.5 left-0.5 rounded bg-slate-950/80 px-1 font-mono-num text-[9px] font-bold text-white">
                        {idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleRemoveUploadedPhoto(photo.id, e)}
                        className="absolute top-0.5 right-0.5 rounded bg-red-600/90 p-0.5 text-white opacity-90 hover:bg-red-700 cursor-pointer"
                        aria-label={`사진 ${idx + 1} 삭제`}
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  );
                })}
                {uploadedPhotos.length < MAX_UPLOAD_PHOTOS && (
                  <button
                    type="button"
                    onClick={() => albumInputRef.current?.click()}
                    className="flex aspect-square flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-white text-slate-500 hover:border-orange-500 hover:text-orange-600 cursor-pointer"
                    title="사진 추가 업로드"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-[9px] font-semibold">추가</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Area Adjuster Control */}
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>시공 대상 환산 면적 (평수 조절 시 표준품셈 물량 자동 재산출)</span>
              <span className="font-mono-num text-sm font-bold text-orange-600">
                {pyeong}평 (약 {Math.round(pyeong * 3.3058)}㎡)
              </span>
            </div>
            <input
              type="range"
              min={3}
              max={100}
              value={pyeong}
              onChange={(e) => setPyeong(Number(e.target.value))}
              aria-label="현장 평수 조절"
              className="mt-2 h-2 w-full cursor-pointer accent-orange-600"
            />
            <div className="mt-1 flex justify-between font-mono-num text-[11px] text-slate-500">
              <span>3평 (소규모 보수/담장/화장실)</span>
              <span>25평 (표준 상가)</span>
              <span>50평</span>
              <span>100평</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right 6 cols: AI 30-Second Estimate Output Report (Based on Construction Standard Pumsem) */}
      <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-900 p-6 text-white shadow-xs lg:col-span-6">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
            <div>
              <p className="text-xs font-semibold text-orange-400">
                AI 사진 30초 견적 리포트 · 정부 공인 건설공사 표준품셈 산정
              </p>
              <h3 className="mt-0.5 text-lg font-bold text-white">{reportTitle}</h3>
            </div>
            <span className="font-mono-num text-xs text-emerald-400">
              분석 사진: {uploadedPhotos.length > 0 ? `${uploadedPhotos.length}장` : '샘플 1장'} ·{' '}
              {scanState === 'scanning' ? '품셈 산출 중' : '표준품셈 산정 완료'}
            </span>
          </div>

          {/* Standard Pumsem Verification Banner */}
          <div className="mt-4 rounded-lg border border-orange-500/30 bg-orange-950/30 p-3.5">
            <div className="flex items-start gap-2.5">
              <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
              <div className="text-xs leading-relaxed">
                <p className="font-bold text-orange-300">
                  산정 기준: 건설부(국토교통부·한국건설기술연구원) 제정 ‘건설공사 표준품셈’ 및 시중노임단가
                </p>
                <p className="mt-0.5 text-slate-300">
                  적용 조항: {estimatedReport.appliedChapter}
                </p>
                <p className="mt-0.5 text-slate-400">
                  세부 산식: {estimatedReport.appliedBasis}
                </p>
              </div>
            </div>
          </div>

          {/* Total Price Range Highlight */}
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/80 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-slate-400">
                표준품셈 기반 예상 시공비 ({customSizeInput.trim() ? `${customSizeInput.trim()} · ` : ''}{pyeong}평 / {Math.round(pyeong * 3.3)}㎡ 환산 · 1년 무상 A/S 포함)
              </span>
              <span className="text-xs text-orange-400">
                평균 소요: {matchedService.duration}
              </span>
            </div>
            <p className="mt-2 font-mono-num text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {estimatedReport.minPrice.toLocaleString()}만 원 ~{' '}
              <span className="text-orange-400">
                {estimatedReport.maxPrice.toLocaleString()}만 원
              </span>
            </p>

            {/* 3-Column Itemized Cost Breakdown with Pumsem Details */}
            <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-800/90 pt-4 text-xs sm:grid-cols-3">
              <div>
                <p className="text-slate-400">
                  KS 정품 자재비 (할증 {matchedService.pumsem.materialAllowancePct}% 반영)
                </p>
                <p className="mt-1 font-mono-num text-sm font-semibold text-white">
                  약 {estimatedReport.materialCost.toLocaleString()}만 원
                </p>
              </div>
              <div>
                <p className="text-slate-400">표준품셈 직접노무비 (총 {estimatedReport.totalPum}품)</p>
                <p className="mt-1 font-mono-num text-sm font-semibold text-white">
                  약 {estimatedReport.laborCost.toLocaleString()}만 원
                </p>
                <p className="mt-0.5 font-mono-num text-[11px] text-slate-400">
                  기능공 {estimatedReport.skilledPum}품 + 보통인부 {estimatedReport.generalPum}품
                </p>
              </div>
              <div>
                <p className="text-slate-400">공구손료·기계경비·폐기물</p>
                <p className="mt-1 font-mono-num text-sm font-semibold text-white">
                  약 {estimatedReport.wasteAndEquipCost.toLocaleString()}만 원
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  예상 폐기물: {activePreset.wasteTons}
                </p>
              </div>
            </div>
          </div>

          {/* Detected Site Requirements & Standard Scope */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
              <p className="text-xs font-semibold text-orange-400">
                01. 사진·실측 사이즈 기반 감지 물량
              </p>
              <ul className="mt-2.5 space-y-2 text-xs leading-relaxed text-slate-300">
                {isCustomWorkApplied && customWorkInput.trim() ? (
                  <>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-400" />
                      <span>요청 공정: {customWorkInput.trim()}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-400" />
                      <span>
                        입력 치수/물량: {customSizeInput.trim() || `환산 면적 약 ${pyeong}평 (${Math.round(pyeong * 3.3)}㎡)`}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-400" />
                      <span>
                        첨부 현장 사진 {uploadedPhotos.length}장 (표준대비물품 스케일 판독 연동)
                      </span>
                    </li>
                  </>
                ) : (
                  activePreset.detectedIssues.map((issue, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-400" />
                      <span>{issue}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
              <p className="text-xs font-semibold text-emerald-400">
                02. 표준품셈 적용 권장 공정
              </p>
              <ul className="mt-2.5 space-y-2 text-xs leading-relaxed text-slate-300">
                {isCustomWorkApplied && customWorkInput.trim() ? (
                  <>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <span>기존 손상 부위 해체·정리 및 바탕면 보강 (보통인부 {estimatedReport.generalPum}품)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <span>KS 정품 자재 반입 및 전문 기능공 본시공 (기능공 {estimatedReport.skilledPum}품)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <span>공구손료(3%)·폐기물 적법 반출 및 1년 무상 시공 A/S 보증서 발급</span>
                    </li>
                  </>
                ) : (
                  activePreset.recommendedScope.map((scope, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <span>{scope}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col gap-3 border-t border-slate-800 pt-5 sm:flex-row">
          <button
            type="button"
            onClick={() => onOpenCalculator(activePreset.category, pyeong)}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-xs font-semibold text-white transition-colors hover:bg-slate-700 whitespace-nowrap cursor-pointer"
          >
            <Calculator className="h-4 w-4 text-orange-400" />
            표준품셈 셀프 계산기 열기
          </button>
          <button
            type="button"
            onClick={() =>
              onOpenConsultation(
                `[AI 표준품셈 30초 견적 연동] 대상: ${reportTitle} / 실측치수: ${
                  customSizeInput.trim() || `${pyeong}평`
                } / 업로드 사진: ${uploadedPhotos.length}장 / ${
                  estimatedReport.appliedChapter
                } 적용 / 총 노무 ${estimatedReport.totalPum}품 / 예상 범위 ${
                  estimatedReport.minPrice
                }~${estimatedReport.maxPrice}만 원`,
                isCustomWorkApplied && customWorkInput.trim()
                  ? `자유 공종: ${customWorkInput.trim()}`
                  : matchedService.categoryLabel
              )
            }
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-500 whitespace-nowrap cursor-pointer"
          >
            이 품셈 내역으로 확정 견적 · 무료 방문실측 받기
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
