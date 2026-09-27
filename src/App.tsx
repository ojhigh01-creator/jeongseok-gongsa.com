import React, { useState, useMemo, useEffect } from 'react';
import {
  Camera,
  Phone,
  CheckCircle,
  Wrench,
  Menu,
  X,
  Calculator,
  MessageSquare,
  ChevronDown,
  Plus,
  Images,
  FileCheck2,
  Edit3,
  Trash2,
  Lock,
  Unlock,
  Eye,
  Info,
  Upload,
} from 'lucide-react';
import {
  SERVICE_TABS,
  SERVICES_DATA,
  ServiceCategoryKey,
  ServiceItem,
  ServicePhotoItem,
  VERIFIED_CASE_STUDIES,
  DIRECT_PHONE,
} from './data/constructionData';
import { AiEstimateSimulator } from './components/AiEstimateSimulator';
import { SelfEstimateModal, ConsultationModal } from './components/Modals';
import { GalleryManagerModal } from './components/GalleryManagerModal';
import {
  loadCustomGallery,
  saveCustomGallery,
  clearCustomGallery,
  subscribeToCloudGallery,
  CloudSyncState,
  processImageFileWithSpecs,
  isSupportedImageFile,
  PHOTO_UPLOAD_SPECS,
} from './utils/galleryStorage';

export default function App() {
  const [servicesList, setServicesList] = useState<ServiceItem[]>(SERVICES_DATA);
  const [activeServiceTab, setActiveServiceTab] = useState<ServiceCategoryKey>('all');
  const [aiSimulatorCategory, setAiSimulatorCategory] =
    useState<ServiceCategoryKey>('demolition');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState<boolean>(false);

  // Per-card selected photo index in multi-photo gallery
  const [activePhotoIndexByCard, setActivePhotoIndexByCard] = useState<Record<string, number>>(
    {}
  );
  // Per-card inline "Replace/Edit Photo + Subtitle" or "Add New Photo" form
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<'replace' | 'add'>('replace');
  const [editPhotoSubtitle, setEditPhotoSubtitle] = useState<string>('');
  const [editPhotoSpecNote, setEditPhotoSpecNote] = useState<string>('');
  const [editServiceSubtitle, setEditServiceSubtitle] = useState<string>('');
  const [editPhotoDataUrl, setEditPhotoDataUrl] = useState<string>('');
  const [editPhotoSpecSummary, setEditPhotoSpecSummary] = useState<string>('');
  const [editPhotoError, setEditPhotoError] = useState<string>('');
  const [saveToastByCard, setSaveToastByCard] = useState<Record<string, string>>({});

  // Full Gallery Manager Modal state
  const [galleryManagerOpen, setGalleryManagerOpen] = useState<boolean>(false);
  const [galleryManagerServiceId, setGalleryManagerServiceId] = useState<string | undefined>(
    undefined
  );

  // Admin Photo Edit Mode state (Default: TRUE so owner can immediately upload/replace photos, with 1-click toggle to preview customer view)
  const [isAdminMode, setIsAdminMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('visitor') === 'true' || params.get('admin') === 'false') {
        return false;
      }
      const savedMode = window.localStorage.getItem('jeongseok_admin_mode');
      if (savedMode === 'false') return false;
    }
    return true;
  });
  const [adminAuthModalOpen, setAdminAuthModalOpen] = useState<boolean>(false);
  const [adminPinInput, setAdminPinInput] = useState<string>('');
  const [adminPinError, setAdminPinError] = useState<string>('');

  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [cloudSyncState, setCloudSyncState] = useState<CloudSyncState>('connecting');

  // Load persisted custom real photos & subtitles on mount + subscribe to real-time Firebase Firestore updates
  useEffect(() => {
    let isMounted = true;

    loadCustomGallery().then((saved) => {
      if (isMounted && saved && saved.length > 0) {
        setServicesList(saved);
        setBrokenImages({});
      }
    });

    const unsubscribe = subscribeToCloudGallery(
      (cloudServices) => {
        if (isMounted && cloudServices && cloudServices.length > 0) {
          setServicesList(cloudServices);
          setBrokenImages({});
        }
      },
      (state) => {
        if (isMounted) {
          setCloudSyncState(state);
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateAndPersistServices = (nextServices: ServiceItem[]) => {
    setServicesList(nextServices);
    setBrokenImages({});
    setCloudSyncState('syncing');
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      saveCustomGallery(nextServices)
        .then(() => {
          setCloudSyncState('synced');
        })
        .catch((err) => {
          setCloudSyncState('error');
          const msg =
            err instanceof Error
              ? err.message
              : '사진 저장 중 용량 초과 오류가 발생했습니다. 일부 사진을 삭제해 주세요.';
          setEditPhotoError(msg);
        });
    }, 300);
  };

  // Modals state
  const [calculatorModalOpen, setCalculatorModalOpen] = useState<boolean>(false);
  const [calculatorInitCategory, setCalculatorInitCategory] =
    useState<ServiceCategoryKey>('demolition');
  const [calculatorInitPyeong, setCalculatorInitPyeong] = useState<number>(25);

  const [consultModalOpen, setConsultModalOpen] = useState<boolean>(false);
  const [consultNote, setConsultNote] = useState<string>('');
  const [consultCategory, setConsultCategory] = useState<string>('철거 · 원상복구');

  const filteredServices = useMemo(() => {
    if (activeServiceTab === 'all') return servicesList;
    return servicesList.filter(
      (item) =>
        item.category === activeServiceTab || item.parentCategory === activeServiceTab
    );
  }, [activeServiceTab, servicesList]);

  const handleSelectServiceFromNav = (category: ServiceCategoryKey) => {
    setActiveServiceTab(category);
    setServiceDropdownOpen(false);
    setMobileMenuOpen(false);
    const el = document.getElementById('services');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleJumpToAiEstimateWithCategory = (item: ServiceItem) => {
    setAiSimulatorCategory(item.category);
    const el = document.getElementById('ai-estimate');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleOpenCalculator = (
    category: ServiceCategoryKey = 'demolition',
    pyeong: number = 25
  ) => {
    setCalculatorInitCategory(category);
    setCalculatorInitPyeong(pyeong);
    setCalculatorModalOpen(true);
  };

  const handleOpenConsultation = (
    note: string = '',
    categoryLabel: string = '철거 · 원상복구'
  ) => {
    setConsultNote(note);
    setConsultCategory(categoryLabel);
    setConsultModalOpen(true);
  };

  const handleOpenInlineEditor = (
    srv: ServiceItem,
    mode: 'replace' | 'add',
    photoIdx?: number
  ) => {
    const targetIdx =
      photoIdx !== undefined
        ? photoIdx
        : Math.min(activePhotoIndexByCard[srv.id] ?? 0, srv.photos.length - 1);
    const currentPhoto = srv.photos[targetIdx] || srv.photos[0];

    if (editingCardId === srv.id && editorMode === mode && photoIdx === undefined) {
      setEditingCardId(null);
      return;
    }

    setActivePhotoIndexByCard((prev) => ({ ...prev, [srv.id]: targetIdx }));
    setEditingCardId(srv.id);
    setEditorMode(mode);
    setEditServiceSubtitle(srv.subtitle);

    if (mode === 'replace' && currentPhoto) {
      setEditPhotoSubtitle(currentPhoto.subtitle);
      setEditPhotoSpecNote(currentPhoto.specNote);
      setEditPhotoDataUrl('');
      setEditPhotoSpecSummary('');
    } else {
      setEditPhotoSubtitle(`${srv.categoryLabel} 실제 시공 현장 사진`);
      setEditPhotoSpecNote('건우 코퍼레이션 정석공사 실제 시공 현장 · 1년 무상 A/S 보증');
      setEditPhotoDataUrl('');
      setEditPhotoSpecSummary('');
    }
    setEditPhotoError('');
  };

  /**
   * 카드 상단 또는 썸네일에서 파일 선택 즉시 실제 시공 사진으로 교체·영구 저장
   */
  const handleInstantReplaceCardPhoto = async (
    srv: ServiceItem,
    photoIdx: number,
    file?: File
  ) => {
    if (!file) return;
    try {
      const processed = await processImageFileWithSpecs(file);
      const targetPhoto = srv.photos[photoIdx] || srv.photos[0];
      const updatedList = servicesList.map((item) => {
        if (item.id !== srv.id) return item;
        const updatedPhotos = item.photos.map((p, idx) =>
          idx === photoIdx ? { ...p, url: processed.dataUrl } : p
        );
        return { ...item, photos: updatedPhotos };
      });
      updateAndPersistServices(updatedList);
      setActivePhotoIndexByCard((prev) => ({ ...prev, [srv.id]: photoIdx }));
      // 사진 교체 즉시 해당 사진의 소제목 편집창도 자동으로 열어 바로 소제목을 수정할 수 있도록 연동
      setEditingCardId(srv.id);
      setEditorMode('replace');
      if (targetPhoto) {
        setEditPhotoSubtitle(targetPhoto.subtitle);
        setEditPhotoSpecNote(targetPhoto.specNote);
      }
      setEditServiceSubtitle(srv.subtitle);
      setEditPhotoDataUrl(processed.dataUrl);
      setEditPhotoSpecSummary(processed.specSummary);
      setEditPhotoError('');
      setSaveToastByCard((prev) => ({
        ...prev,
        [srv.id]: `✓ [PHOTO 0${photoIdx + 1}] 내 실제 시공 사진으로 즉시 교체 완료! 아래에서 소제목을 바로 수정하세요. (${processed.specSummary})`,
      }));
      setTimeout(() => {
        setSaveToastByCard((prev) => {
          const copy = { ...prev };
          delete copy[srv.id];
          return copy;
        });
      }, 4500);
    } catch (err) {
      setEditPhotoError(
        err instanceof Error
          ? err.message
          : '사진 업로드 중 오류가 발생했습니다. (20MB 이하 JPG/PNG/WEBP 지원)'
      );
    }
  };

  /**
   * 카드 상단 [+ 사진 추가]에서 파일 선택 즉시 새 시공 사진 슬롯으로 추가·영구 저장
   */
  const handleInstantAddCardPhotos = async (
    srv: ServiceItem,
    files: FileList | null
  ) => {
    if (!files || files.length === 0) return;
    const validFiles = Array.from(files).filter((f) => isSupportedImageFile(f));
    if (validFiles.length === 0) {
      setEditPhotoError(
        `지원하지 않는 파일 형식입니다. 허용 형식: ${PHOTO_UPLOAD_SPECS.supportedFormatsLabel} (${PHOTO_UPLOAD_SPECS.heicGuideText})`
      );
      return;
    }

    try {
      const addedItems: ServicePhotoItem[] = [];
      let lastSpec = '';
      for (let i = 0; i < validFiles.length; i++) {
        const f = validFiles[i];
        const processed = await processImageFileWithSpecs(f);
        lastSpec = processed.specSummary;
        const cleanName = (f.name || `현장사진_${i + 1}`).replace(/\.[^/.]+$/, '');
        addedItems.push({
          id: `real-${Date.now()}-${i}`,
          url: processed.dataUrl,
          subtitle:
            editPhotoSubtitle.trim() ||
            `${srv.categoryLabel} 실제 시공 현장 (${cleanName})`,
          specNote:
            editPhotoSpecNote.trim() ||
            '건우 코퍼레이션 정석공사 실제 시공 현장 사진 · 1년 무상 A/S 보증',
        });
      }

      if (addedItems.length > 0) {
        let newLastIdx = 0;
        const updatedList = servicesList.map((item) => {
          if (item.id !== srv.id) return item;
          const nextPhotos = [...item.photos, ...addedItems];
          newLastIdx = nextPhotos.length - 1;
          return { ...item, photos: nextPhotos };
        });
        updateAndPersistServices(updatedList);
        setActivePhotoIndexByCard((prev) => ({ ...prev, [srv.id]: newLastIdx }));
        setSaveToastByCard((prev) => ({
          ...prev,
          [srv.id]: `✓ 새 실제 시공 사진 ${addedItems.length}장 업로드 및 저장 완료! (${lastSpec})`,
        }));
        setTimeout(() => {
          setSaveToastByCard((prev) => {
            const copy = { ...prev };
            delete copy[srv.id];
            return copy;
          });
        }, 4500);
      }
    } catch (err) {
      setEditPhotoError(
        err instanceof Error ? err.message : '사진 추가 중 오류가 발생했습니다.'
      );
    }
  };

  const handleEditPhotoFileSelect = async (srv: ServiceItem, file?: File) => {
    if (!file) return;
    try {
      const processed = await processImageFileWithSpecs(file);
      setEditPhotoDataUrl(processed.dataUrl);
      setEditPhotoSpecSummary(processed.specSummary);
      setEditPhotoError('');

      // 인라인 편집창에서도 사진 선택 즉시 해당 슬롯에 바로 반영하여 누락 방지
      if (editorMode === 'replace') {
        const targetIdx = Math.min(
          activePhotoIndexByCard[srv.id] ?? 0,
          srv.photos.length - 1
        );
        const updatedList = servicesList.map((item) => {
          if (item.id !== srv.id) return item;
          const updatedPhotos = item.photos.map((p, idx) =>
            idx === targetIdx ? { ...p, url: processed.dataUrl } : p
          );
          return { ...item, photos: updatedPhotos };
        });
        updateAndPersistServices(updatedList);
        setSaveToastByCard((prev) => ({
          ...prev,
          [srv.id]: `✓ 실제 현장 사진이 즉시 적용되었습니다! (${processed.specSummary})`,
        }));
      }
    } catch (err) {
      setEditPhotoError(
        err instanceof Error
          ? err.message
          : '사진 파일을 읽는 중 오류가 발생했습니다.'
      );
    }
  };

  const handleSaveInlinePhotoOrSubtitle = (srv: ServiceItem) => {
    const targetIdx = Math.min(
      activePhotoIndexByCard[srv.id] ?? 0,
      srv.photos.length - 1
    );
    const currentPhoto = srv.photos[targetIdx] || srv.photos[0];

    if (editorMode === 'add' && !editPhotoDataUrl) {
      setEditPhotoError('추가할 실제 현장 사진 파일을 먼저 선택해 주세요.');
      return;
    }

    const finalSubtitle =
      editPhotoSubtitle.trim() ||
      currentPhoto?.subtitle ||
      `${srv.categoryLabel} 실제 시공 현장`;

    const updatedList = servicesList.map((item) => {
      if (item.id !== srv.id) return item;

      const nextServiceSubtitle = editServiceSubtitle.trim() || item.subtitle;

      if (editorMode === 'replace' && currentPhoto) {
        const updatedPhotos = item.photos.map((p, idx) =>
          idx === targetIdx
            ? {
                ...p,
                url: editPhotoDataUrl || p.url,
                subtitle: finalSubtitle,
                specNote: editPhotoSpecNote.trim() || p.specNote,
              }
            : p
        );
        return {
          ...item,
          subtitle: nextServiceSubtitle,
          photos: updatedPhotos,
        };
      } else {
        const newPhotoItem: ServicePhotoItem = {
          id: `real-${Date.now()}`,
          url: editPhotoDataUrl,
          subtitle: finalSubtitle,
          specNote:
            editPhotoSpecNote.trim() ||
            '건우 코퍼레이션 정석공사 실제 시공 현장 사진',
        };
        const updatedPhotos = [...item.photos, newPhotoItem];
        setActivePhotoIndexByCard((idxMap) => ({
          ...idxMap,
          [srv.id]: updatedPhotos.length - 1,
        }));
        return {
          ...item,
          subtitle: nextServiceSubtitle,
          photos: updatedPhotos,
        };
      }
    });

    updateAndPersistServices(updatedList);
    setEditingCardId(null);
    setEditPhotoDataUrl('');
    setEditPhotoSpecSummary('');
    setEditPhotoError('');
    setSaveToastByCard((prev) => ({
      ...prev,
      [srv.id]:
        editorMode === 'replace'
          ? '✓ 실제 현장 사진 및 소제목이 변경되어 영구 저장되었습니다.'
          : '✓ 새 실제 현장 사진 및 소제목이 추가되어 영구 저장되었습니다.',
    }));
    setTimeout(() => {
      setSaveToastByCard((prev) => {
        const copy = { ...prev };
        delete copy[srv.id];
        return copy;
      });
    }, 3500);
  };

  const handleDeletePhotoOnCard = (srv: ServiceItem, photoId: string) => {
    if (srv.photos.length <= 1) {
      setEditPhotoError(
        '최소 1장의 사진은 유지되어야 합니다. 위에서 [실제 현장 사진 선택]으로 사진을 교체해 주세요.'
      );
      return;
    }
    const updatedList = servicesList.map((item) => {
      if (item.id !== srv.id) return item;
      const nextPhotos = item.photos.filter((p) => p.id !== photoId);
      return { ...item, photos: nextPhotos };
    });
    updateAndPersistServices(updatedList);
    setActivePhotoIndexByCard((prev) => ({ ...prev, [srv.id]: 0 }));
  };

  const handleVerifyAdminPin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = adminPinInput.trim();
    // Accept 2233 (last 4 digits of 010-5306-2233) or 49016 (last 5 digits of business reg 213-02-49016)
    if (cleaned === '2233' || cleaned === '49016') {
      setIsAdminMode(true);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('jeongseok_admin_mode', 'true');
      }
      setAdminAuthModalOpen(false);
      setAdminPinInput('');
      setAdminPinError('');
      const el = document.getElementById('services');
      el?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setAdminPinError('관리자 비밀번호가 일치하지 않습니다. (초기 비밀번호: 직통번호 뒷자리 2233)');
    }
  };

  const handleExitAdminMode = () => {
    setIsAdminMode(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('jeongseok_admin_mode', 'false');
    }
    setEditingCardId(null);
    setGalleryManagerOpen(false);
  };

  const handleEnableAdminModeDirectly = () => {
    setIsAdminMode(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('jeongseok_admin_mode', 'true');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-16 md:pb-0">
      {/* Admin Mode Active Top Banner (Visible ONLY when Admin Mode is unlocked) */}
      {isAdminMode && (
        <div className="sticky top-0 z-50 border-b border-orange-500/40 bg-slate-950 px-4 py-2.5 text-white shadow-md">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded bg-orange-600 px-2 py-0.5 font-bold text-white">
                <Unlock className="h-3 w-3" />
                관리자 사진 편집 모드 ON
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-bold ${
                  cloudSyncState === 'syncing'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : cloudSyncState === 'error'
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}
              >
                <CheckCircle className="h-3 w-3" />
                {cloudSyncState === 'syncing'
                  ? 'Firebase 클라우드 실시간 저장 중...'
                  : cloudSyncState === 'error'
                  ? '클라우드 동기화 확인 필요'
                  : 'Firebase 실시간 DB 연동됨 (전 사용자 공유 중)'}
              </span>
              <span className="text-slate-300">
                사진·소제목을 수정하면 <strong className="text-emerald-400">사이트에 접속하는 모든 고객에게 실시간 공유</strong>되며, 편집 버튼은 <strong className="text-white underline">일반 방문자에게는 보이지 않습니다.</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setGalleryManagerServiceId(filteredServices[0]?.id || servicesList[0]?.id);
                  setGalleryManagerOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-md bg-orange-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-500 cursor-pointer"
              >
                <Camera className="h-3.5 w-3.5" />
                통합 사진·소제목 관리창 열기
              </button>
              <button
                type="button"
                onClick={handleExitAdminMode}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5 text-emerald-400" />
                일반 고객 화면으로 전환 (버튼 숨기기)
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 1. Header & Dynamic GNB (Strict 3-Zone Top Bar Contract) */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#ai-estimate"
            className="text-base font-bold tracking-tight text-slate-900 sm:text-lg whitespace-nowrap"
          >
            정석공사 | 철거·원상복구·인테리어 전문
          </a>

          {/* Zone 2: 4 Clean Navigation Links matching IA 100% */}
          <nav
            aria-label="주요 메뉴"
            className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600"
          >
            <a
              href="#ai-estimate"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap"
            >
              AI 사진 견적
            </a>

            <button
              type="button"
              onClick={() =>
                handleOpenConsultation(
                  '[상단 GNB 공사 상담 요청] 실시간 1:1 정석 견적 및 공정 상담 희망',
                  '철거 · 원상복구'
                )
              }
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap cursor-pointer"
            >
              공사 상담
            </button>

            {/* 공사 서비스 Dropdown with IA Sub-items */}
            <div
              className="relative"
              onMouseEnter={() => setServiceDropdownOpen(true)}
              onMouseLeave={() => setServiceDropdownOpen(false)}
            >
              <button
                type="button"
                onClick={() => handleSelectServiceFromNav('all')}
                className="flex items-center gap-1 hover:text-slate-900 transition-colors whitespace-nowrap cursor-pointer py-1"
                aria-expanded={serviceDropdownOpen}
              >
                <span>공사 서비스</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {serviceDropdownOpen && (
                <div className="absolute left-0 top-full w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                  <button
                    type="button"
                    onClick={() => handleSelectServiceFromNav('demolition')}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-orange-600"
                  >
                    <span>철거 · 원상복구</span>
                    <span className="font-mono-num text-[11px] text-slate-400">평당 12만~</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectServiceFromNav('waterproofing')}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-orange-600"
                  >
                    <span>방수 · 외벽보수</span>
                    <span className="font-mono-num text-[11px] text-slate-400">평당 15만~</span>
                  </button>
                  <div className="my-1 border-t border-slate-100 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSelectServiceFromNav('interior')}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-xs font-semibold text-slate-800 hover:bg-slate-50 hover:text-orange-600"
                    >
                      <span>인테리어 · 리모델링</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectServiceFromNav('bathroom')}
                      className="flex w-full items-center justify-between rounded-lg py-1.5 pr-3 pl-5 text-left text-xs font-medium text-orange-600 hover:bg-orange-50/60"
                    >
                      <span>↳ 화장실 성능개선 & 리모델링 (특화)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectServiceFromNav('deck')}
                      className="flex w-full items-center justify-between rounded-lg py-1.5 pr-3 pl-5 text-left text-xs font-medium text-orange-600 hover:bg-orange-50/60"
                    >
                      <span>↳ 데크시공 리모델링 (특화)</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectServiceFromNav('plumbing_metal')}
                    className="flex w-full items-center justify-between rounded-lg border-t border-slate-100 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-orange-600"
                  >
                    <span>설비 · 금속 · 기타</span>
                    <span className="font-mono-num text-[11px] text-slate-400">평당 18만~</span>
                  </button>
                </div>
              )}
            </div>

            <a
              href="#about"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap"
            >
              브랜드 스토리
            </a>
          </nav>

          {/* Zone 3: 2 Primary Actions + Mobile Menu Button */}
          <div className="flex items-center gap-2.5">
            <a
              href="#ai-estimate"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-500 whitespace-nowrap"
            >
              <Camera className="h-3.5 w-3.5" />
              AI 사진 30초 견적
            </a>
            <button
              type="button"
              onClick={() =>
                handleOpenConsultation(
                  `[24시 직통상담 요청 (${DIRECT_PHONE})] 현장 견적 및 당일 실측 문의`,
                  '철거 · 원상복구'
                )
              }
              className="hidden md:inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 whitespace-nowrap"
            >
              <Phone className="h-3.5 w-3.5 text-orange-400" />
              24시 직통상담
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
              aria-label="모바일 메뉴 열기"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Responsive Drawer */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden">
            <div className="flex flex-col space-y-2 text-sm font-semibold text-slate-800">
              <a
                href="#ai-estimate"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 hover:bg-slate-50"
              >
                1. AI 사진 견적 (/ai-estimate)
              </a>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleOpenConsultation(
                    '[모바일 메뉴 1:1 상담 요청]',
                    '철거 · 원상복구'
                  );
                }}
                className="rounded-lg px-3 py-2 text-left hover:bg-slate-50"
              >
                2. 공사 상담 (실시간 1:1 카카오/전화 {DIRECT_PHONE})
              </button>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-bold text-slate-500">
                  3. 공사 서비스 (/services)
                </p>
                <div className="mt-2 grid grid-cols-1 gap-1.5 pl-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleSelectServiceFromNav('demolition')}
                    className="py-1 text-left font-semibold text-slate-700 hover:text-orange-600"
                  >
                    · 철거 · 원상복구
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectServiceFromNav('waterproofing')}
                    className="py-1 text-left font-semibold text-slate-700 hover:text-orange-600"
                  >
                    · 방수 · 외벽보수
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectServiceFromNav('interior')}
                    className="py-1 text-left font-semibold text-slate-700 hover:text-orange-600"
                  >
                    · 인테리어 · 리모델링
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectServiceFromNav('bathroom')}
                    className="py-1 pl-3 text-left font-semibold text-orange-600"
                  >
                    * 화장실 성능개선 & 리모델링 (특화)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectServiceFromNav('deck')}
                    className="py-1 pl-3 text-left font-semibold text-orange-600"
                  >
                    * 데크시공 리모델링 (특화)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectServiceFromNav('plumbing_metal')}
                    className="py-1 text-left font-semibold text-slate-700 hover:text-orange-600"
                  >
                    · 설비 · 금속 · 기타
                  </button>
                </div>
              </div>
              <a
                href="#about"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 hover:bg-slate-50"
              >
                4. 브랜드 스토리 (3대 정석 시공 원칙 & 1년 시공 A/S)
              </a>
            </div>
          </div>
        )}
      </header>

      {/* 2. Hero Section & AI Photo 30-Second Estimate Simulator */}
      <section
        id="ai-estimate"
        className="border-b border-slate-200 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 py-14 text-white sm:py-20"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-none">
            {/* Clean Unboxed Metadata Line (Zero-Pill Compliance) */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wide text-orange-400">
              <span>AI 사진 30초 견적</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-200">건설부(국토교통부) 제정 건설공사 표준품셈 산정</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400">1년 무상 시공 A/S 체계</span>
            </div>

            <h1 className="responsive-headline mt-4 w-full text-[clamp(1.55rem,3.6vw,3.15rem)] font-bold tracking-tight text-white leading-[1.22] lg:leading-[1.15]">
              사진 한 장으로 시작하는 투명한 정석 견적
            </h1>

            <p className="mt-4 w-full max-w-6xl text-[clamp(0.925rem,1.3vw,1.125rem)] leading-relaxed text-slate-300 break-keep">
              현장 사진 한 장만 올리시면 정부 공인{' '}
              <strong className="font-semibold text-white">‘건설공사 표준품셈’</strong> 및{' '}
              <strong className="font-semibold text-white">‘대한건설협회 시중노임단가’</strong>를
              기준으로 철거 물량, 자재 할증률, 공종별 투입 품수까지 30초 만에 정밀 산정합니다.{' '}
              <br className="hidden xl:inline" />
              추가금 덤터기 없는 100% 정석 시공을 경험하세요.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
              <button
                type="button"
                onClick={() => handleOpenCalculator('demolition', 25)}
                className="inline-flex items-center justify-center gap-3 rounded-xl bg-orange-600 px-7 py-4 text-base font-bold text-white shadow-lg shadow-orange-600/25 transition-all hover:bg-orange-500 sm:px-9 sm:py-5 sm:text-lg lg:text-xl whitespace-nowrap cursor-pointer"
              >
                <Calculator className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
                표준품셈 셀프 견적 계산기
              </button>
              <a
                href={`tel:${DIRECT_PHONE}`}
                className="inline-flex items-center justify-center gap-3 rounded-xl border-2 border-slate-600 bg-slate-800/95 px-7 py-4 text-base font-bold text-white shadow-lg transition-all hover:border-orange-400 hover:bg-slate-800 sm:px-9 sm:py-5 sm:text-lg lg:text-xl whitespace-nowrap"
              >
                <Phone className="h-5 w-5 sm:h-6 sm:w-6 text-orange-400 shrink-0" />
                <span>
                  24시 엔지니어 직통 상담{' '}
                  <span className="font-mono-num text-orange-400">({DIRECT_PHONE})</span>
                </span>
              </a>
            </div>
          </div>

          {/* Interactive AI Photo Upload Simulator (Pumsem-based, No Before/After Slider) */}
          <AiEstimateSimulator
            selectedCategoryFromService={aiSimulatorCategory}
            servicesList={servicesList}
            onOpenCalculator={handleOpenCalculator}
            onOpenConsultation={handleOpenConsultation}
          />
        </div>
      </section>

      {/* 3. Section 3: 공사 서비스 (Multi-Photo Gallery with Subtitles & Custom Photo Upload) */}
      <section id="services" className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 border-b border-slate-200 pb-8 lg:flex-row lg:items-end">
            <div className="w-full lg:max-w-4xl">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-orange-600">
                <span>건설공사 표준품셈 일위대가 적용</span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-500">공종별 다양한 시공 사진 및 사진별 소제목 갤러리</span>
              </div>
              <h2 className="responsive-headline mt-2 text-[clamp(1.4rem,2.6vw,2.25rem)] font-bold tracking-tight text-slate-900 leading-snug">
                정석공사 전문 시공 서비스 갤러리
              </h2>
              <p className="mt-2 w-full text-[clamp(0.875rem,1.2vw,1rem)] leading-relaxed text-slate-600 break-keep">
                {isAdminMode ? (
                  <>
                    <strong className="font-semibold text-orange-600">[관리자 편집 모드]</strong> 기존 샘플 사진을 보유하신{' '}
                    <strong className="font-semibold text-slate-900">실제 시공 현장 사진과 소제목</strong>으로
                    자유롭게 교체·수정하실 수 있으며, 변경된 사진과 소제목은 자동 저장됩니다.
                  </>
                ) : (
                  <>
                    모든 시공은 국토교통부 건설공사 표준품셈 일위대가와 대한건설협회 시중노임단가를 기준으로 투명하게 산출됩니다. 공종별 실제 시공 공정과 세부 스펙, 표준 단가 가이드를 확인하세요.
                  </>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
              {isAdminMode && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setGalleryManagerServiceId(filteredServices[0]?.id || servicesList[0]?.id);
                      setGalleryManagerOpen(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-orange-500 whitespace-nowrap cursor-pointer"
                  >
                    <Camera className="h-4 w-4" />
                    갤러리 사진·소제목 내 실제 사진으로 변경/관리
                  </button>
                  <button
                    type="button"
                    onClick={handleExitAdminMode}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200 whitespace-nowrap cursor-pointer"
                    title="일반 방문자 화면처럼 사진 변경 버튼들을 모두 숨깁니다"
                  >
                    <Eye className="h-3.5 w-3.5 text-emerald-600" />
                    일반 고객 화면 미리보기 (버튼 숨김)
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => handleOpenCalculator(activeServiceTab, 25)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 transition-colors hover:border-slate-900 hover:bg-slate-50 whitespace-nowrap cursor-pointer"
              >
                <Calculator className="h-4 w-4 text-orange-600" />
                표준품셈 단가표 · 셀프 계산기
              </button>
            </div>
          </div>

          {/* Uploadable Photo Size Specification Banner (Shown when Admin Photo Upload Mode is ON) */}
          {isAdminMode && (
            <div className="mt-5 flex flex-col justify-between gap-3 rounded-xl border border-orange-200 bg-orange-50/70 p-4 text-xs text-slate-700 lg:flex-row lg:items-center">
              <div className="flex items-start gap-2.5">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                <div className="space-y-1 leading-relaxed">
                  <p className="font-bold text-slate-900">
                    [업로드 가능 사진 사이즈 및 규격 안내] 내 실제 시공 사진 1클릭 즉시 업로드·교체
                  </p>
                  <p>
                    • <strong className="text-slate-900">권장 이미지 사이즈:</strong>{' '}
                    <span className="font-mono-num font-bold text-orange-700">
                      가로 1,200px × 세로 900px (4:3 가로 비율 · 압축률 0.78 자동 최적화)
                    </span>{' '}
                    · 사진 1장당 평균 <span className="font-mono-num font-semibold">200~350KB</span>로 자동 경량화되어 새로고침 후에도 영구 유지됩니다.
                  </p>
                  <p>
                    • <strong className="text-slate-900">파일 용량 및 지원 형식:</strong>{' '}
                    <span className="font-mono-num font-bold text-orange-700">
                      1장당 최대 {PHOTO_UPLOAD_SPECS.maxFileSizeMB}MB 이하 ({PHOTO_UPLOAD_SPECS.supportedFormatsLabel})
                    </span>{' '}
                    · <span className="font-medium text-amber-900">{PHOTO_UPLOAD_SPECS.heicGuideText}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setGalleryManagerServiceId(filteredServices[0]?.id || servicesList[0]?.id);
                  setGalleryManagerOpen(true);
                }}
                className="shrink-0 self-start rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 lg:self-center cursor-pointer"
              >
                통합 사진 관리창 열기 ↗
              </button>
            </div>
          )}

          {/* Interactive Filter Tabs (Functional Segmented Control) */}
          <div
            role="tablist"
            aria-label="공사 서비스 분류"
            className="mt-6 flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-200/75 p-1.5"
          >
            {SERVICE_TABS.map((tab) => {
              const isSelected = activeServiceTab === tab.key;
              return (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={isSelected}
                  type="button"
                  onClick={() => setActiveServiceTab(tab.key)}
                  className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-white/70 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Services Gallery Grid */}
          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
            {filteredServices.map((srv, index) => {
              const selectedPhotoIdx = Math.min(
                activePhotoIndexByCard[srv.id] ?? 0,
                srv.photos.length - 1
              );
              const activePhoto = srv.photos[selectedPhotoIdx] || srv.photos[0];
              const isBroken = brokenImages[activePhoto.id];
              const isEditingThisCard = editingCardId === srv.id;
              const cardToast = saveToastByCard[srv.id];

              return (
                <article
                  key={srv.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white overflow-hidden transition-colors hover:border-slate-300"
                >
                  <div>
                    {/* Active Photo Viewer with Photo-Specific Subtitle */}
                    <div className="relative aspect-4/3 w-full overflow-hidden bg-slate-900">
                      {!isBroken ? (
                        <img
                          src={activePhoto.url}
                          alt={activePhoto.subtitle}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setBrokenImages((prev) => ({ ...prev, [activePhoto.id]: true }))
                          }
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center bg-slate-800 p-6 text-center text-white">
                          <Wrench className="h-8 w-8 text-orange-400" />
                          <p className="mt-2 text-sm font-bold">{activePhoto.subtitle}</p>
                          <p className="mt-1 text-xs text-slate-300">{activePhoto.specNote}</p>
                        </div>
                      )}

                      {/* Top Bar: Photo Count & (Admin Only) 1-Click Direct File Upload/Replace Buttons */}
                      <div className="absolute top-3 right-3 left-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded bg-slate-950/85 px-2.5 py-1 text-xs font-semibold text-white">
                          <Images className="h-3.5 w-3.5 text-orange-400" />
                          시공 사진 {selectedPhotoIdx + 1} / {srv.photos.length}
                        </span>
                        {isAdminMode && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <label className="inline-flex cursor-pointer items-center gap-1 rounded bg-orange-600 px-2.5 py-1 text-xs font-bold text-white shadow-xs transition-colors hover:bg-orange-500 whitespace-nowrap">
                              <Upload className="h-3.5 w-3.5" />
                              <span>내 실제 사진으로 즉시 교체</span>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                                onChange={(e) => {
                                  handleInstantReplaceCardPhoto(
                                    srv,
                                    selectedPhotoIdx,
                                    e.target.files?.[0]
                                  );
                                  e.target.value = '';
                                }}
                                className="hidden"
                              />
                            </label>
                            <label className="inline-flex cursor-pointer items-center gap-1 rounded bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-900 shadow-xs transition-colors hover:bg-slate-900 hover:text-white whitespace-nowrap">
                              <Plus className="h-3.5 w-3.5" />
                              <span>+ 사진 추가</span>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                                multiple
                                onChange={(e) => {
                                  handleInstantAddCardPhotos(srv, e.target.files);
                                  e.target.value = '';
                                }}
                                className="hidden"
                              />
                            </label>
                          </div>
                        )}
                      </div>

                      {/* Bottom Measured Scrim Displaying the Selected Photo's Subtitle & Spec */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 via-slate-950/80 to-transparent p-4 text-white">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-semibold text-orange-400">
                            시공 공정 상세 (PHOTO 0{selectedPhotoIdx + 1})
                          </p>
                          {isAdminMode && (
                            <button
                              type="button"
                              onClick={() => handleOpenInlineEditor(srv, 'replace')}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300 underline hover:text-orange-400 cursor-pointer"
                            >
                              <Edit3 className="h-3 w-3" />
                              소제목·사진 수정
                            </button>
                          )}
                        </div>
                        <p className="mt-0.5 text-sm font-bold text-white sm:text-base">
                          {activePhoto.subtitle}
                        </p>
                        <p className="mt-1 text-xs text-slate-300">{activePhoto.specNote}</p>
                      </div>
                    </div>

                    {/* Save Confirmation Banner */}
                    {cardToast && (
                      <div className="bg-emerald-600 px-4 py-2 text-xs font-bold text-white">
                        {cardToast}
                      </div>
                    )}

                    {/* Multi-Photo Thumbnail Strip */}
                    <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                        <span>
                          {isAdminMode
                            ? `클릭하여 사진 전환 · 각 사진을 내 실제 현장 사진으로 교체 가능 (${srv.photos.length}장)`
                            : `썸네일을 클릭하여 공종별 세부 시공 사진을 확인하세요 (${srv.photos.length}장)`}
                        </span>
                        {isAdminMode && (
                          <button
                            type="button"
                            onClick={() => {
                              setGalleryManagerServiceId(srv.id);
                              setGalleryManagerOpen(true);
                            }}
                            className="font-bold text-orange-600 hover:underline cursor-pointer"
                          >
                            전체 사진·소제목 한눈에 편집 ↗
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {srv.photos.map((photo, pIdx) => {
                          const isCurrent = pIdx === selectedPhotoIdx;
                          return (
                            <div
                              key={photo.id}
                              onClick={() => {
                                setActivePhotoIndexByCard((prev) => ({
                                  ...prev,
                                  [srv.id]: pIdx,
                                }));
                                if (editingCardId === srv.id && editorMode === 'replace') {
                                  setEditPhotoSubtitle(photo.subtitle);
                                  setEditPhotoSpecNote(photo.specNote);
                                  setEditPhotoDataUrl('');
                                  setEditPhotoSpecSummary('');
                                }
                              }}
                              className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-1.5 text-left transition-colors ${
                                isCurrent
                                  ? 'border-orange-600 bg-white shadow-2xs'
                                  : 'border-slate-200 bg-slate-100/70 hover:bg-white'
                              }`}
                            >
                              <img
                                src={photo.url}
                                alt={photo.subtitle}
                                referrerPolicy="no-referrer"
                                className="h-10 w-12 shrink-0 rounded object-cover bg-slate-800"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="font-mono-num text-[10px] font-bold text-orange-600">
                                    PHOTO 0{pIdx + 1}
                                  </p>
                                  {isAdminMode && (
                                    <label
                                      onClick={(e) => e.stopPropagation()}
                                      className="cursor-pointer rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-bold text-orange-700 underline hover:bg-orange-600 hover:text-white"
                                      title="클릭하여 이 슬롯의 사진을 내 실제 사진으로 즉시 교체"
                                    >
                                      사진교체
                                      <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                                        onChange={(e) => {
                                          handleInstantReplaceCardPhoto(
                                            srv,
                                            pIdx,
                                            e.target.files?.[0]
                                          );
                                          e.target.value = '';
                                        }}
                                        className="hidden"
                                      />
                                    </label>
                                  )}
                                </div>
                                <p className="truncate text-xs font-semibold text-slate-800">
                                  {photo.subtitle}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Inline Replace / Edit / Add Form (Strictly Admin Mode Only) */}
                      {isAdminMode && isEditingThisCard && (
                        <div className="mt-3 rounded-xl border-2 border-orange-500 bg-white p-4 shadow-md">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                            <p className="text-xs font-bold text-slate-900">
                              {editorMode === 'replace'
                                ? `[PHOTO 0${selectedPhotoIdx + 1}] 내 실제 현장 사진으로 교체 및 소제목 수정`
                                : `[${srv.title}] 새 실제 현장 사진 및 소제목 추가`}
                            </p>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenInlineEditor(srv, 'replace')}
                                className={`rounded px-2 py-1 text-[11px] font-bold ${
                                  editorMode === 'replace'
                                    ? 'bg-orange-600 text-white'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                현재 사진·소제목 교체
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenInlineEditor(srv, 'add')}
                                className={`rounded px-2 py-1 text-[11px] font-bold ${
                                  editorMode === 'add'
                                    ? 'bg-orange-600 text-white'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                + 새 사진 추가
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 space-y-3">
                            <div>
                              <label className="block text-xs font-bold text-slate-800">
                                1. 내 PC / 스마트폰에서 실제 시공 사진 선택{' '}
                                {editorMode === 'replace' ? '(선택 즉시 사진 자동 교체됨)' : '(필수)'}
                              </label>
                              <p className="mt-0.5 text-[11px] text-slate-500">
                                권장 사이즈: 가로 1200×900px (4:3) · 최대 20MB 이하 ({PHOTO_UPLOAD_SPECS.supportedFormatsLabel}) · {PHOTO_UPLOAD_SPECS.heicGuideText}
                              </p>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                                onChange={(e) => {
                                  handleEditPhotoFileSelect(srv, e.target.files?.[0]);
                                  e.target.value = '';
                                }}
                                className="mt-1.5 block w-full text-xs text-slate-600 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-slate-900 file:px-3.5 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-orange-600"
                              />
                              {editPhotoDataUrl && (
                                <div className="mt-2 flex items-center gap-2 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800">
                                  <img
                                    src={editPhotoDataUrl}
                                    alt="선택된 실제 사진 미리보기"
                                    className="h-12 w-16 rounded object-cover"
                                  />
                                  <div>
                                    <p className="font-bold">
                                      ✓ 실제 시공 사진 업로드 완료 ({editPhotoSpecSummary})
                                    </p>
                                    <p className="text-[11px] text-emerald-700">
                                      {editorMode === 'replace'
                                        ? '사진은 이미 즉시 교체되었으며, 아래 소제목 수정 후 [저장하기]를 누르시면 소제목까지 저장됩니다.'
                                        : '아래 [실제 사진·소제목 저장하기] 버튼을 누르면 새 사진 슬롯으로 추가됩니다.'}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-800">
                                2. 이 사진의 소제목 (사진 하단 및 썸네일 표시) <span className="text-orange-600">*</span>
                              </label>
                              <input
                                type="text"
                                value={editPhotoSubtitle}
                                onChange={(e) => setEditPhotoSubtitle(e.target.value)}
                                placeholder="예: 역삼동 35평 식당 주방 방수턱 파쇄 및 배관 정밀 캡핑 완료"
                                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-orange-600 focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700">
                                3. 사진 보조 설명 (시공 스펙 요약)
                              </label>
                              <input
                                type="text"
                                value={editPhotoSpecNote}
                                onChange={(e) => setEditPhotoSpecNote(e.target.value)}
                                placeholder="예: 건우 코퍼레이션 직영 시공 · 건물 관리단 검수 1회 통과"
                                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:border-orange-600 focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700">
                                4. 이 공종 카드의 대표 소제목 수정
                              </label>
                              <input
                                type="text"
                                value={editServiceSubtitle}
                                onChange={(e) => setEditServiceSubtitle(e.target.value)}
                                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-orange-700 focus:border-orange-600 focus:outline-none"
                              />
                            </div>

                            {editPhotoError && (
                              <p className="text-xs font-semibold text-red-600">{editPhotoError}</p>
                            )}

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                              {editorMode === 'replace' && srv.photos.length > 1 ? (
                                <button
                                  type="button"
                                  onClick={() => handleDeletePhotoOnCard(srv, activePhoto.id)}
                                  className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />이 사진 삭제
                                </button>
                              ) : (
                                <span />
                              )}

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingCardId(null)}
                                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                  취소
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveInlinePhotoOrSubtitle(srv)}
                                  className="rounded-md bg-orange-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-orange-500"
                                >
                                  실제 사진·소제목 저장하기
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Content Body */}
                    <div className="p-6">
                      {/* Clean Unboxed Metadata Line (Zero-Pill Discipline) */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-slate-800">
                          0{index + 1}. {srv.categoryLabel}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{srv.duration}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-orange-600">{srv.warrantyNote}</span>
                      </div>

                      <h3 className="mt-2 text-xl font-bold text-slate-900">{srv.title}</h3>
                      <p className="mt-1 text-sm font-semibold text-orange-600">
                        “{srv.subtitle}”
                      </p>

                      {/* Pumsem Basis Line */}
                      <div className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600">
                        <FileCheck2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-800" />
                        <span>
                          <strong className="text-slate-900">표준품셈 기준:</strong>{' '}
                          {srv.pumsem.chapterCode} (자재 할증 {srv.pumsem.materialAllowancePct}% 적용)
                        </span>
                      </div>

                      {/* 3 Key Construction Points Bullet List */}
                      <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-700">
                        {srv.bulletPoints.map((pt, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-900" />
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Card Footer: Transparent Price Guide & Direct AI Photo Estimate CTA */}
                  <div className="border-t border-slate-100 bg-slate-50/80 px-6 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs text-slate-500">
                          표준품셈 기반 예상 단가 가이드
                        </p>
                        <p className="font-mono-num text-lg font-bold text-slate-900">
                          {srv.unitPriceLabel}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenCalculator(srv.category, 20)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-900 hover:text-slate-900 whitespace-nowrap"
                        >
                          품셈 계산
                        </button>
                        <button
                          type="button"
                          onClick={() => handleJumpToAiEstimateWithCategory(srv)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-500 whitespace-nowrap"
                        >
                          <Camera className="h-3.5 w-3.5" />이 공종으로 AI 사진 30초 견적받기
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Section 4: 브랜드 스토리 (3대 정석 시공 원칙 & 1년 무상 시공 A/S 체계) */}
      <section id="about" className="border-t border-slate-200 bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-none">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-orange-600">
              <span>정석공사 브랜드 스토리</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-500">3대 정석 시공 원칙 & 1년 무상 시공 A/S 체계</span>
            </div>
            <h2 className="responsive-headline mt-2 w-full text-[clamp(1.4rem,2.7vw,2.35rem)] font-bold tracking-tight text-slate-900 leading-[1.25] break-keep">
              건설부 표준품셈과 3대 정석 시공 원칙으로 현장 추가금을 끝냅니다
            </h2>
            <p className="mt-3 w-full max-w-6xl text-[clamp(0.925rem,1.25vw,1.05rem)] leading-relaxed text-slate-600 break-keep">
              저가 견적으로 유인한 뒤 착공 후 폐기물비·양중비·방수비를 부풀리는 관행을 거부합니다.
              정석공사는 국토교통부 건설공사 표준품셈 기반 내역서와 직영 시공팀 운영, 1년 무상 A/S
              체계로 끝까지 책임집니다.
            </p>
          </div>

          {/* 3 Core Principles Grid */}
          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-6">
              <p className="font-mono-num text-xs font-bold text-orange-600">
                01. 건설공사 표준품셈 내역서 원칙
              </p>
              <h3 className="mt-2 text-lg font-bold text-slate-900">
                항목별 자재/인건비 100% 공개 (추가금 0원 원칙)
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
                ‘일식(一式)’으로 뭉뚱그린 견적서를 발행하지 않습니다. 정부 공인 건설공사 표준품셈과
                대한건설협회 시중노임단가를 기준으로 KS 정품 자재 물량(할증률 포함), 기능공·보통인부
                투입 품수, 폐기물 차량 톤수를 계약서에 명시하여 현장 임의 추가금을 0원으로 보장합니다.
              </p>
              <p className="mt-4 border-t border-slate-200 pt-3 font-mono-num text-xs font-semibold text-slate-800">
                실측 후 계약 금액 대비 추가금 발생률 0.0% (2025~2026 누적 기준)
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-6">
              <p className="font-mono-num text-xs font-bold text-orange-600">
                02. 비대면 실시간 공정 검수
              </p>
              <h3 className="mt-2 text-lg font-bold text-slate-900">
                매일 공정별 시공 사진 실시간 알림톡 전송
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
                바쁜 점주와 건물주를 위해 현장에 방문하지 않아도 모든 공정을 한눈에 파악할 수
                있도록 철거 후 슬래브 상태, 방수 1·2·3차 도막 두께, 배관 매립 수압 테스트 사진을
                매일 카카오 알림톡 리포트로 발송합니다.
              </p>
              <p className="mt-4 border-t border-slate-200 pt-3 font-mono-num text-xs font-semibold text-slate-800">
                전 현장 평균 1일 4회 공정 사진 및 자재 정품 인증샷 발송
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-900 p-6 text-white">
              <p className="font-mono-num text-xs font-bold text-orange-400">
                03. 1년 무상 시공 A/S 체계
              </p>
              <h3 className="mt-2 text-lg font-bold text-white">
                1년 무상 시공 A/S 전담팀 운영 및 신속 대응 체계
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
                공사 대금 정산 후 연락이 두절되는 하도급 브로커 구조가 아닙니다. 준공 즉시
                ‘1년 무상 시공 A/S 전자보증서’를 발급하며, 누수·타일 들뜸·데크 처짐 등 시공 하자
                접수 시 24시간 내 직영 A/S 엔지니어가 무상 출동합니다.
              </p>
              <p className="mt-4 border-t border-slate-800 pt-3 font-mono-num text-xs font-semibold text-emerald-400">
                하자 접수 후 24시간 내 현장 대응률 99.4% · 1년 무상 보증
              </p>
            </div>
          </div>

          {/* Claim-to-Proof Adjacency: Verified Client Outcomes & Metrics */}
          <div className="mt-12 rounded-xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-semibold text-orange-600">
                  실제 준공 데이터 및 고객 검증 사례
                </p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">
                  누적 3,480건 정석 시공 완료 · 실제 의뢰인 후기
                </h3>
              </div>
              <div className="flex flex-wrap gap-6 font-mono-num text-xs text-slate-600">
                <div>
                  <span className="block text-lg font-bold text-slate-900">3,480건+</span>
                  <span>누적 정석 준공</span>
                </div>
                <div>
                  <span className="block text-lg font-bold text-orange-600">0.0%</span>
                  <span>계약 외 부당 추가금</span>
                </div>
                <div>
                  <span className="block text-lg font-bold text-slate-900">1년 무상</span>
                  <span>전 공종 A/S 보증</span>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {VERIFIED_CASE_STUDIES.map((cs) => (
                <div
                  key={cs.id}
                  className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-5"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-500">{cs.category}</p>
                    <h4 className="mt-1.5 text-base font-bold text-slate-900">{cs.title}</h4>
                    <p className="mt-2 font-mono-num text-xs font-semibold text-orange-600">
                      {cs.metrics}
                    </p>
                    <p className="mt-3 text-xs leading-relaxed text-slate-600">“{cs.outcome}”</p>
                  </div>
                  <p className="mt-4 border-t border-slate-100 pt-3 text-xs font-semibold text-slate-800">
                    — {cs.client}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. Quiet Footer */}
      <footer className="border-t border-slate-200 bg-slate-950 py-12 text-slate-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-center">
            <div>
              <p className="text-base font-bold text-white">
                정석공사 | 철거·원상복구·인테리어 전문
              </p>
              <p className="mt-2 text-xs text-slate-400">
                사진 한 장으로 시작하는 투명한 정석 견적 · 건설부 표준품셈 기반 100% 정석 시공 & 1년 무상 시공 A/S 체계
              </p>
              <p className="mt-2 font-mono-num text-xs text-slate-500">
                24시 엔지니어 직통상담: {DIRECT_PHONE} · 카카오톡 채널: @정석공사_30초견적 · 서울특별시 강남구 테헤란로 정석빌딩 4층
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleOpenCalculator('demolition', 25)}
                className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 whitespace-nowrap"
              >
                표준품셈 셀프 계산기
              </button>
              <button
                type="button"
                onClick={() =>
                  handleOpenConsultation(
                    '[하단 푸터 상담 요청] 1:1 정석 견적 및 무료 방문실측 신청',
                    '철거 · 원상복구'
                  )
                }
                className="rounded-lg bg-orange-600 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-500 whitespace-nowrap"
              >
                무료 방문실측 신청
              </button>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-900 pt-6 text-xs leading-relaxed text-slate-400">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-medium text-slate-300">
                <span>웹사이트 소유자 및 실제 사업주체: 건우 코퍼레이션</span>
                <span aria-hidden="true" className="text-slate-700">|</span>
                <span className="font-mono-num">사업자등록번호: 213-02-49016</span>
                <span aria-hidden="true" className="text-slate-700">|</span>
                <span>대표자명: 오 종 화</span>
                <span aria-hidden="true" className="text-slate-700">|</span>
                <span className="font-mono-num">24시 직통상담: {DIRECT_PHONE}</span>
              </div>

              {/* Discreet Owner-Only Admin Trigger in Footer */}
              <div>
                {isAdminMode ? (
                  <button
                    type="button"
                    onClick={handleExitAdminMode}
                    className="inline-flex items-center gap-1.5 rounded border border-orange-500/50 bg-orange-950/40 px-2.5 py-1 text-[11px] font-semibold text-orange-300 hover:bg-orange-900/50 cursor-pointer"
                  >
                    <Unlock className="h-3 w-3" />
                    관리자 모드 종료 (일반 방문자 화면 보기)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAdminPinInput('');
                      setAdminPinError('');
                      setAdminAuthModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-slate-600 transition-colors hover:bg-slate-900 hover:text-slate-400 cursor-pointer"
                    title="건우 코퍼레이션 관리자 전용 사진·소제목 설정"
                  >
                    <Lock className="h-3 w-3" />
                    <span>관리자</span>
                  </button>
                )}
              </div>
            </div>
            <p className="mt-2 text-slate-500">
              © {new Date().getFullYear()} 건우 코퍼레이션 (정석공사 | 철거·원상복구·인테리어 전문). All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Mobile-Only Floating Bottom Sticky Bar (Compact <= 52px, strictly within 15% mobile sticky cap) */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex h-13 items-center justify-between border-t border-slate-800 bg-slate-950/95 px-3 text-white backdrop-blur-xs md:hidden">
        <a
          href={`tel:${DIRECT_PHONE}`}
          className="flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-semibold text-white whitespace-nowrap"
        >
          <Phone className="h-3.5 w-3.5 text-orange-400" />
          <span>24시 직통 {DIRECT_PHONE}</span>
        </a>
        <span className="h-4 w-px bg-slate-800" aria-hidden="true" />
        <button
          type="button"
          onClick={() =>
            handleOpenConsultation(
              '[모바일 하단바 카카오톡 1:1 빠른 견적상담 요청]',
              '철거 · 원상복구'
            )
          }
          className="flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-semibold text-[#FEE500] whitespace-nowrap"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>카톡 1:1 상담</span>
        </button>
        <a
          href="#ai-estimate"
          className="ml-2 rounded-md bg-orange-600 px-3 py-1.5 text-xs font-bold text-white whitespace-nowrap"
        >
          AI 30초 견적
        </a>
      </div>

      {/* Interactive Modals */}
      <SelfEstimateModal
        isOpen={calculatorModalOpen}
        onClose={() => setCalculatorModalOpen(false)}
        initialCategory={calculatorInitCategory}
        initialPyeong={calculatorInitPyeong}
        onProceedToConsult={(summary, categoryLabel) => {
          setCalculatorModalOpen(false);
          handleOpenConsultation(summary, categoryLabel);
        }}
      />

      <ConsultationModal
        isOpen={consultModalOpen}
        onClose={() => setConsultModalOpen(false)}
        prefilledNote={consultNote}
        prefilledCategory={consultCategory}
      />

      <GalleryManagerModal
        isOpen={galleryManagerOpen}
        onClose={() => setGalleryManagerOpen(false)}
        servicesList={servicesList}
        initialServiceId={galleryManagerServiceId}
        cloudSyncState={cloudSyncState}
        onUpdateServices={updateAndPersistServices}
        onResetToDefault={() => {
          clearCustomGallery().then((defaults) => {
            setServicesList(defaults);
            setActivePhotoIndexByCard({});
          });
        }}
      />

      {/* Admin Authentication Modal (Owner Only) */}
      {adminAuthModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-auth-title"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-orange-600" />
                <h3 id="admin-auth-title" className="text-base font-bold text-slate-900">
                  건우 코퍼레이션 관리자 인증
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAdminAuthModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleVerifyAdminPin} className="mt-4 space-y-4">
              <p className="text-xs leading-relaxed text-slate-600">
                일반 고객 화면에서는 갤러리 사진·소제목 변경 버튼이 모두 숨겨져 있습니다.
                실제 현장 사진 등록 및 소제목 수정을 위해 관리자 비밀번호를 입력해 주세요.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-800">
                  관리자 비밀번호 입력
                </label>
                <input
                  type="password"
                  value={adminPinInput}
                  onChange={(e) => {
                    setAdminPinInput(e.target.value);
                    setAdminPinError('');
                  }}
                  placeholder="비밀번호 입력 (직통번호 뒷 4자리: 2233)"
                  autoFocus
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-orange-600 focus:outline-none"
                />
                {adminPinError && (
                  <p className="mt-1.5 text-xs font-semibold text-red-600">{adminPinError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdminAuthModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-orange-600 px-5 py-2 text-xs font-bold text-white hover:bg-orange-500 cursor-pointer"
                >
                  관리자 사진 편집 모드 켜기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
