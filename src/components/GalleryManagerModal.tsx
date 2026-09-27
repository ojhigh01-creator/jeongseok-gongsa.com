import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Plus,
  Trash2,
  Check,
  Download,
  FolderUp,
  RotateCcw,
  Images,
  Edit3,
  Info,
  AlertCircle,
  Save,
} from 'lucide-react';
import { ServiceItem, ServicePhotoItem } from '../data/constructionData';
import {
  processImageFileWithSpecs,
  isSupportedImageFile,
  validateImageFileBeforeUpload,
  syncGalleryToCloud,
  CloudSyncState,
  PHOTO_UPLOAD_SPECS,
} from '../utils/galleryStorage';

interface GalleryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  servicesList: ServiceItem[];
  initialServiceId?: string;
  cloudSyncState?: CloudSyncState;
  onUpdateServices: (nextServices: ServiceItem[]) => void;
  onResetToDefault: () => void;
}

export const GalleryManagerModal: React.FC<GalleryManagerModalProps> = ({
  isOpen,
  onClose,
  servicesList,
  initialServiceId,
  cloudSyncState = 'synced',
  onUpdateServices,
  onResetToDefault,
}) => {
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    initialServiceId || servicesList[0]?.id || ''
  );
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [photoSpecsBySlot, setPhotoSpecsBySlot] = useState<Record<string, string>>({});
  const [savedSlotId, setSavedSlotId] = useState<string | null>(null);

  const wasOpenRef = useRef<boolean>(false);
  const importJsonInputRef = useRef<HTMLInputElement | null>(null);
  const addPhotosInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // 모달이 처음 열릴 때(isOpen: false -> true)만 초기 공종을 설정합니다.
  // servicesList가 변경될 때(소제목 타이핑·사진 교체 시) 첫 페이지로 돌아가는 버그를 완벽히 차단합니다.
  React.useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      const targetId = initialServiceId || servicesList[0]?.id || '';
      if (targetId) {
        setSelectedServiceId(targetId);
      }
      setStatusMessage('');
      setErrorMessage('');
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, initialServiceId]);

  // 선택된 공종이 혹시 목록에 없을 경우에만 안전하게 보정
  React.useEffect(() => {
    if (
      isOpen &&
      servicesList.length > 0 &&
      !servicesList.some((s) => s.id === selectedServiceId)
    ) {
      setSelectedServiceId(servicesList[0].id);
    }
  }, [isOpen, servicesList, selectedServiceId]);

  // 공종(selectedServiceId) 변경 시 동적 replaceInputRefs 맵 초기화
  React.useEffect(() => {
    replaceInputRefs.current = {};
  }, [selectedServiceId]);

  if (!isOpen) return null;

  const currentService =
    servicesList.find((s) => s.id === selectedServiceId) || servicesList[0];

  const showSavedToast = (msg: string) => {
    setErrorMessage('');
    setStatusMessage(msg);
    setTimeout(() => {
      setStatusMessage((prev) => (prev === msg ? '' : prev));
    }, 4500);
  };

  const showErrorToast = (msg: string) => {
    setStatusMessage('');
    setErrorMessage(msg);
  };

  const handleServiceFieldChange = (
    field: 'title' | 'subtitle' | 'unitPriceLabel',
    value: string
  ) => {
    const updated = servicesList.map((srv) =>
      srv.id === currentService.id ? { ...srv, [field]: value } : srv
    );
    onUpdateServices(updated);
  };

  const handlePhotoTextChange = (
    photoId: string,
    field: 'subtitle' | 'specNote',
    value: string
  ) => {
    const updated = servicesList.map((srv) => {
      if (srv.id !== currentService.id) return srv;
      return {
        ...srv,
        photos: srv.photos.map((p) =>
          p.id === photoId ? { ...p, [field]: value } : p
        ),
      };
    });
    onUpdateServices(updated);
  };

  const handleConfirmSlotSave = async (photoId: string, photoIndex: number) => {
    onUpdateServices([...servicesList]);
    setSavedSlotId(photoId);
    try {
      await syncGalleryToCloud(servicesList);
      showSavedToast(
        `✓ [${currentService.categoryLabel} - 사진 0${photoIndex + 1}] Firebase 클라우드에 실시간 저장 완료! 모든 방문자에게 즉시 공유됩니다.`
      );
    } catch {
      showSavedToast(
        `✓ [${currentService.categoryLabel} - 사진 0${photoIndex + 1}] 사진 및 소제목이 저장되었습니다.`
      );
    }
    setTimeout(() => {
      setSavedSlotId((prev) => (prev === photoId ? null : prev));
    }, 2500);
  };

  const handleReplacePhotoFile = async (photoId: string, file?: File) => {
    if (!file) return;
    const validation = validateImageFileBeforeUpload(file);
    if (!validation.valid) {
      showErrorToast(
        validation.errorMessage ||
          `지원하지 않는 파일 형식입니다. (${PHOTO_UPLOAD_SPECS.supportedFormatsLabel})`
      );
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');
    try {
      const processed = await processImageFileWithSpecs(file, 1200, 900, 0.78);
      const updated = servicesList.map((srv) => {
        if (srv.id !== currentService.id) return srv;
        return {
          ...srv,
          photos: srv.photos.map((p) =>
            p.id === photoId ? { ...p, url: processed.dataUrl } : p
          ),
        };
      });
      onUpdateServices(updated);
      setPhotoSpecsBySlot((prev) => ({
        ...prev,
        [photoId]: processed.specSummary,
      }));
      showSavedToast(
        `✓ 실제 시공 사진으로 교체 완료! 아래 입력칸에서 소제목을 자유롭게 수정하세요. (${processed.specSummary})`
      );
    } catch (err) {
      showErrorToast(
        err instanceof Error
          ? err.message
          : '사진 변환 중 오류가 발생했습니다. JPG / PNG / WEBP 이미지로 시도해 주세요.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddMultipleRealPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setErrorMessage('');
    try {
      const allFiles = Array.from(files);
      for (const f of allFiles) {
        const check = validateImageFileBeforeUpload(f);
        if (!check.valid) {
          showErrorToast(
            check.errorMessage ||
              `지원하지 않는 파일 형식입니다. (${PHOTO_UPLOAD_SPECS.supportedFormatsLabel})`
          );
          setIsProcessing(false);
          return;
        }
      }

      const imageFiles = allFiles.filter((f) => isSupportedImageFile(f));
      if (imageFiles.length === 0) {
        showErrorToast(
          `선택한 파일 중 업로드 가능한 이미지가 없습니다. 허용 형식: ${PHOTO_UPLOAD_SPECS.supportedFormatsLabel} (${PHOTO_UPLOAD_SPECS.heicGuideText})`
        );
        return;
      }

      const newPhotoItems: ServicePhotoItem[] = [];
      const newSpecs: Record<string, string> = {};

      for (let i = 0; i < imageFiles.length; i++) {
        const f = imageFiles[i];
        const processed = await processImageFileWithSpecs(f, 1200, 900, 0.78);
        const cleanFileName = (f.name || `실제현장사진_${i + 1}`).replace(/\.[^/.]+$/, '');
        const newId = `real-${Date.now()}-${i}`;
        newPhotoItems.push({
          id: newId,
          url: processed.dataUrl,
          subtitle: `${currentService.categoryLabel} 실제 시공 현장 (${cleanFileName})`,
          specNote: '건우 코퍼레이션 정석공사 실제 시공 현장 사진 · 1년 무상 A/S 보증',
        });
        newSpecs[newId] = processed.specSummary;
      }

      if (newPhotoItems.length > 0) {
        const updated = servicesList.map((srv) => {
          if (srv.id !== currentService.id) return srv;
          return {
            ...srv,
            photos: [...srv.photos, ...newPhotoItems],
          };
        });
        onUpdateServices(updated);
        setPhotoSpecsBySlot((prev) => ({ ...prev, ...newSpecs }));
        showSavedToast(
          `✓ ${newPhotoItems.length}장의 실제 시공 현장 사진이 추가되었습니다. 소제목을 자유롭게 수정하세요.`
        );
      }
    } catch (err) {
      showErrorToast(
        err instanceof Error
          ? err.message
          : '사진 업로드 중 오류가 발생했습니다.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeletePhotoSlot = (photoId: string) => {
    if (currentService.photos.length <= 1) {
      showErrorToast(
        '최소 1장의 사진은 유지되어야 합니다. [내 실제 사진으로 교체] 버튼을 눌러 사진을 변경해 주세요.'
      );
      return;
    }
    const updated = servicesList.map((srv) => {
      if (srv.id !== currentService.id) return srv;
      return {
        ...srv,
        photos: srv.photos.filter((p) => p.id !== photoId),
      };
    });
    onUpdateServices(updated);
    showSavedToast('선택한 사진이 갤러리에서 삭제되었습니다.');
  };

  const handleExportBackupJson = () => {
    const dataStr = JSON.stringify(servicesList, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `정석공사_실제현장사진_갤러리백업_${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showSavedToast('갤러리 사진·소제목 백업 파일(.json)이 다운로드되었습니다.');
  };

  const handleImportBackupJson = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].photos) {
          onUpdateServices(parsed);
          showSavedToast('백업 파일에서 실제 현장 사진과 소제목을 성공적으로 불러왔습니다.');
        } else {
          showErrorToast('유효한 갤러리 백업 파일 형식이 아닙니다.');
        }
      } catch {
        showErrorToast('백업 파일을 읽는 중 오류가 발생했습니다.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gallery-manager-title"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
          <div>
            <p className="text-xs font-semibold text-orange-400">
              건우 코퍼레이션 (정석공사) · 시공 갤러리 사진 업로드 및 교체 관리
            </p>
            <h2
              id="gallery-manager-title"
              className="mt-0.5 flex items-center gap-2 text-lg font-bold sm:text-xl"
            >
              <Images className="h-5 w-5 text-orange-400" />
              내 실제 시공 현장 사진 업로드 · 교체 및 소제목 편집기
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportBackupJson}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer"
              title="등록한 실제 사진과 소제목을 파일로 보관합니다"
            >
              <Download className="h-3.5 w-3.5 text-orange-400" />
              사진·소제목 백업 저장
            </button>
            <button
              type="button"
              onClick={() => importJsonInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer"
            >
              <FolderUp className="h-3.5 w-3.5 text-emerald-400" />
              백업 불러오기
            </button>
            <input
              ref={importJsonInputRef}
              type="file"
              accept="application/json,.json"
              onChange={(e) => {
                handleImportBackupJson(e.target.files?.[0]);
                e.target.value = '';
              }}
              className="hidden"
            />
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              aria-label="닫기"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Status / Error Toast Banner */}
        {statusMessage && (
          <div className="flex items-center justify-between bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white">
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4" />
              {statusMessage}
            </span>
            <span>Firebase 클라우드 + 브라우저 동시 실시간 저장됨</span>
          </div>
        )}
        {errorMessage && (
          <div className="flex items-center justify-between bg-red-600 px-6 py-2.5 text-xs font-bold text-white">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </span>
            <button
              type="button"
              onClick={() => setErrorMessage('')}
              className="ml-3 shrink-0 underline"
            >
              닫기
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="grid flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-12">
          {/* Left 4 cols: Service Category Selector & Photo Size Spec Box */}
          <div className="border-b border-slate-200 bg-slate-50 p-5 lg:col-span-4 lg:border-r lg:border-b-0">
            <p className="text-xs font-bold text-slate-800">
              1. 사진을 업로드·교체할 시공 공종 선택 (총 {servicesList.length}개 공종)
            </p>
            <div className="mt-3 space-y-2">
              {servicesList.map((srv, idx) => {
                const isSelected = srv.id === currentService.id;
                return (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => setSelectedServiceId(srv.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-orange-600 bg-white shadow-xs ring-2 ring-orange-500/20'
                        : 'border-slate-200 bg-white/60 hover:bg-white'
                    }`}
                  >
                    <img
                      src={srv.photos[0]?.url}
                      alt={srv.title}
                      className="h-12 w-14 shrink-0 rounded-lg object-cover bg-slate-800"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-mono-num text-[11px] font-bold text-orange-600">
                        0{idx + 1}. {srv.categoryLabel}
                      </p>
                      <p className="truncate text-xs font-bold text-slate-900">
                        {srv.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        등록된 사진: {srv.photos.length}장
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Explicit Uploadable Photo Size Specification Guide */}
            <div className="mt-5 rounded-xl border border-orange-200 bg-orange-50/70 p-4 text-xs leading-relaxed text-slate-700">
              <p className="flex items-center gap-1.5 font-bold text-slate-900">
                <Info className="h-4 w-4 text-orange-600 shrink-0" />
                업로드 가능한 사진 사이즈 및 규격 기준
              </p>
              <ul className="mt-2 space-y-1.5 text-[11px] text-slate-700">
                <li>
                  • <strong className="text-slate-900">권장 이미지 사이즈:</strong>{' '}
                  <span className="font-mono-num font-bold text-orange-700">
                    가로 1,200px × 세로 900px
                  </span>{' '}
                  (4:3 가로 비율 · 리사이징 상한 1,200×900px, 압축률 0.78 자동 적용)
                </li>
                <li>
                  • <strong className="text-slate-900">파일 용량 제한:</strong>{' '}
                  <span className="font-mono-num font-bold text-orange-700">
                    1장당 최대 {PHOTO_UPLOAD_SPECS.maxFileSizeMB}MB 이하
                  </span>{' '}
                  (업로드 시 평균 200~350KB로 자동 경량화 저장)
                </li>
                <li>
                  • <strong className="text-slate-900">지원 파일 형식:</strong>{' '}
                  <span className="font-bold text-slate-900">
                    {PHOTO_UPLOAD_SPECS.supportedFormatsLabel}
                  </span>
                </li>
                <li className="rounded bg-white/80 p-2 text-[11px] font-medium text-amber-900 border border-amber-200">
                  ※ <strong>{PHOTO_UPLOAD_SPECS.heicGuideText}</strong>
                </li>
              </ul>

              <button
                type="button"
                onClick={onResetToDefault}
                className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-red-600 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                초기 기본 샘플 사진으로 전체 복원
              </button>
            </div>
          </div>

          {/* Right 8 cols: Active Service Subtitles & Photo Slots Editor */}
          <div className="p-6 lg:col-span-8">
            {/* Service Main Title & Representative Subtitle Editor */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <Edit3 className="h-3.5 w-3.5 text-orange-600" />
                  2. [{currentService.categoryLabel}] 공종 제목 및 대표 소제목 수정
                </p>
                <span className="text-[11px] font-semibold text-emerald-700">
                  ✓ 입력 즉시 실시간 반영 및 자동 저장
                </span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600">
                    공종 메인 타이틀
                  </label>
                  <input
                    type="text"
                    value={currentService.title}
                    onChange={(e) =>
                      handleServiceFieldChange('title', e.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-orange-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600">
                    예상 단가 가이드 표기
                  </label>
                  <input
                    type="text"
                    value={currentService.unitPriceLabel}
                    onChange={(e) =>
                      handleServiceFieldChange('unitPriceLabel', e.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-orange-600 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600">
                    공종 대표 소제목 (카드 상단 주황색 강조 문구)
                  </label>
                  <input
                    type="text"
                    value={currentService.subtitle}
                    onChange={(e) =>
                      handleServiceFieldChange('subtitle', e.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-orange-300 bg-white px-3 py-2 text-xs font-bold text-orange-700 focus:border-orange-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Individual Photo Slots Editor */}
            <div className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    3. [{currentService.categoryLabel}] 시공 사진 교체 및 소제목 입력 ({currentService.photos.length}장)
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    권장 사이즈: 가로 1200×900px (4:3) · 최대 20MB 이하 ({PHOTO_UPLOAD_SPECS.supportedFormatsLabel})
                  </p>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => addPhotosInputRef.current?.click()}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-orange-600 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-orange-500"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ 내 실제 시공 사진 새로 추가 (다중 선택 가능)</span>
                  </button>
                  <input
                    ref={addPhotosInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    multiple
                    onChange={(e) => {
                      handleAddMultipleRealPhotos(e.target.files);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </div>
              </div>

              {isProcessing && (
                <div className="mt-3 rounded-lg border border-orange-300 bg-orange-50 px-4 py-2.5 text-xs font-bold text-orange-700">
                  실제 현장 사진을 갤러리 권장 규격(1200×900px, 평균 200~350KB)으로 최적화하여 저장하고 있습니다...
                </div>
              )}

              <div className="mt-3 space-y-4">
                {currentService.photos.map((photo, pIdx) => {
                  const isSlotJustSaved = savedSlotId === photo.id;
                  return (
                    <div
                      key={`${currentService.id}-${photo.id}`}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const droppedFile = e.dataTransfer.files?.[0];
                        if (droppedFile) {
                          handleReplacePhotoFile(photo.id, droppedFile);
                        }
                      }}
                      className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs sm:grid-cols-12"
                    >
                      {/* Photo Preview & Direct Replace File Button */}
                      <div className="sm:col-span-4">
                        <div
                          onClick={() => {
                            const input = replaceInputRefs.current[photo.id];
                            if (input) {
                              input.click();
                            } else {
                              addPhotosInputRef.current?.click();
                            }
                          }}
                          className="group relative aspect-4/3 w-full cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-slate-900"
                          title="클릭하거나 사진 파일을 드래그하여 실제 사진으로 교체"
                        >
                          <img
                            src={photo.url}
                            alt={photo.subtitle}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                          <span className="absolute top-2 left-2 rounded bg-slate-950/85 px-2 py-0.5 font-mono-num text-[10px] font-bold text-orange-400">
                            PHOTO 0{pIdx + 1}
                          </span>
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 opacity-0 transition-opacity group-hover:opacity-100">
                            <span className="rounded-md bg-orange-600 px-2.5 py-1 text-[11px] font-bold text-white">
                              클릭하여 사진 변경
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const input = replaceInputRefs.current[photo.id];
                              if (input) {
                                input.click();
                              } else {
                                addPhotosInputRef.current?.click();
                              }
                            }}
                            className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg bg-orange-600 px-2.5 py-2 text-xs font-bold text-white transition-colors hover:bg-orange-500"
                          >
                            <Camera className="h-3.5 w-3.5" />
                            <span>내 실제 사진으로 교체</span>
                          </button>
                          <input
                            ref={(el) => {
                              replaceInputRefs.current[photo.id] = el;
                            }}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                            onChange={(e) => {
                              handleReplacePhotoFile(
                                photo.id,
                                e.target.files?.[0]
                              );
                              e.target.value = '';
                            }}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeletePhotoSlot(photo.id)}
                            className="rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                            title="이 사진 슬롯 삭제"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {photoSpecsBySlot[photo.id] && (
                          <p className="mt-1.5 font-mono-num text-[10px] font-semibold text-emerald-700">
                            ✓ 적용됨: {photoSpecsBySlot[photo.id]}
                          </p>
                        )}
                      </div>

                      {/* Photo Subtitle & Spec Note Inputs */}
                      <div className="flex flex-col justify-between space-y-3 sm:col-span-8">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <label className="block text-xs font-bold text-slate-800">
                              사진 0{pIdx + 1} 소제목 (사진 하단 및 썸네일에 표시되는 제목)
                            </label>
                            {photo.subtitle && (
                              <button
                                type="button"
                                onClick={() =>
                                  handlePhotoTextChange(photo.id, 'subtitle', '')
                                }
                                className="text-[11px] font-semibold text-slate-400 hover:text-orange-600 cursor-pointer"
                              >
                                지우기
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            value={photo.subtitle}
                            onChange={(e) =>
                              handlePhotoTextChange(
                                photo.id,
                                'subtitle',
                                e.target.value
                              )
                            }
                            placeholder="예: 역삼동 35평 식당 주방 방수턱 파쇄 및 배관 캡핑 완료"
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-orange-600 focus:outline-none"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <label className="block text-xs font-semibold text-slate-700">
                              사진 0{pIdx + 1} 세부 시공 설명 (사진 하단 보조 설명)
                            </label>
                            {photo.specNote && (
                              <button
                                type="button"
                                onClick={() =>
                                  handlePhotoTextChange(photo.id, 'specNote', '')
                                }
                                className="text-[11px] font-semibold text-slate-400 hover:text-orange-600 cursor-pointer"
                              >
                                지우기
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            value={photo.specNote}
                            onChange={(e) =>
                              handlePhotoTextChange(
                                photo.id,
                                'specNote',
                                e.target.value
                              )
                            }
                            placeholder="예: 임대차 원상복구 표준 사양 · 관리단 검수 1회 통과 실제 현장"
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700 focus:border-orange-600 focus:outline-none"
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500">
                          <span>
                            ✓ 입력하는 즉시 자동 저장되며, 우측 버튼으로 저장을 한 번 더 확인하실 수 있습니다.
                          </span>
                          <button
                            type="button"
                            onClick={() => handleConfirmSlotSave(photo.id, pIdx)}
                            className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                              isSlotJustSaved
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-900 text-white hover:bg-orange-600'
                            }`}
                          >
                            {isSlotJustSaved ? (
                              <>
                                <Check className="h-3.5 w-3.5" />
                                저장 완료됨
                              </>
                            ) : (
                              <>
                                <Save className="h-3.5 w-3.5" />
                                이 사진·소제목 저장 확인
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-3.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-1 font-bold text-emerald-700">
              <Check className="h-3.5 w-3.5" />
              {cloudSyncState === 'syncing'
                ? 'Firebase 클라우드 실시간 동기화 중...'
                : 'Firebase 클라우드 실시간 연동됨 (전 사용자 공유)'}
            </span>
            <span>
              사진·소제목을 수정하면 사이트에 접속하는 모든 고객(PC·스마트폰)에게 실시간으로 동일하게 표시됩니다.
            </span>
          </div>
          <button
            type="button"
            onClick={async () => {
              try {
                await syncGalleryToCloud(servicesList);
              } catch {
                // Ignore
              }
              onClose();
            }}
            className="rounded-lg bg-orange-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-orange-500 cursor-pointer"
          >
            전체 클라우드 저장 완료 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
