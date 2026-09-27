import { doc, getDoc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { ServiceItem, SERVICES_DATA } from '../data/constructionData';

const DB_NAME = 'jeongseok_construction_db';
const STORE_NAME = 'gallery_store';
const RECORD_KEY = 'jeongseok_gallery';
const LEGACY_RECORD_KEY = 'custom_services_list_v1';
const LOCAL_STORAGE_KEY = 'jeongseok_gallery';
const MAX_INDEXEDDB_BYTES = 40 * 1024 * 1024; // 40MB 상한

// Firestore 컬렉션 및 문서 키
const FIRESTORE_CONFIG_COLLECTION = 'gallery_config';
const FIRESTORE_CONFIG_DOC_ID = 'main';
const FIRESTORE_PHOTOS_COLLECTION = 'gallery_photos';
const FIRESTORE_PHOTO_REF_PREFIX = '__FIRESTORE_PHOTO__:';

const CLIENT_SESSION_ID = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
let lastLocalWriteTimestamp = 0;
const photoDataUrlMemoryCache = new Map<string, string>();

export type CloudSyncState = 'connecting' | 'synced' | 'syncing' | 'offline' | 'error';

/**
 * 1. 공식 업로드 가능 사진 사이즈 및 규격 상수 (기술 검토 보고서 스펙)
 */
export const PHOTO_UPLOAD_SPECS = {
  recommendedWidth: 1200,
  recommendedHeight: 900,
  recommendedRatioLabel: '4:3 가로형 (권장 1200 × 900px)',
  autoOptimizeMaxWidth: 1200,
  autoOptimizeMaxHeight: 900,
  defaultQuality: 0.78,
  maxFileSizeMB: 20,
  maxFileSizeBytes: 20 * 1024 * 1024, // 20MB per photo
  supportedFormatsLabel: 'JPG / PNG / WEBP',
  heicGuideText:
    '아이폰 사진(HEIC): 카카오톡으로 PC에 전송하거나 구글 포토에서 JPG로 다운로드 후 업로드해 주세요.',
};

export interface ProcessedPhotoResult {
  dataUrl: string;
  specSummary: string;
  outputWidth: number;
  outputHeight: number;
  originalWidth: number;
  originalHeight: number;
  originalSizeKB: number;
  outputSizeKB: number;
  fileName: string;
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const ALLOWED_EXT_REGEX = /\.(jpe?g|png|webp)$/i;
const HEIC_EXT_OR_MIME_REGEX = /(\.heic$|\.heif$|image\/heic|image\/heif)/i;

export function isHeicOrHeifFile(file: File): boolean {
  if (!file) return false;
  return (
    HEIC_EXT_OR_MIME_REGEX.test(file.name || '') ||
    HEIC_EXT_OR_MIME_REGEX.test(file.type || '')
  );
}

/**
 * 2. 파일 형식 지원 여부 검사: image/jpeg, image/png, image/webp만 허용 (HEIC 제외)
 */
export function isSupportedImageFile(file: File): boolean {
  if (!file) return false;
  if (isHeicOrHeifFile(file)) return false;

  const mime = (file.type || '').toLowerCase().trim();
  if (ALLOWED_MIME_TYPES.has(mime)) {
    return true;
  }

  // 일부 모바일 인앱 브라우저에서 file.type이 비어 있는 경우 확장자로 JPG/PNG/WEBP 확인
  if (!mime && ALLOWED_EXT_REGEX.test(file.name || '')) {
    return true;
  }

  return false;
}

/**
 * 3. 파일 크기(20MB 초과 여부) 및 미지원 형식(HEIC 등) 사전 검증
 */
export function validateImageFileBeforeUpload(file: File): {
  valid: boolean;
  errorMessage?: string;
} {
  if (!file || file.size === 0) {
    return {
      valid: false,
      errorMessage: '선택된 사진 파일이 비어 있습니다. 다른 사진을 선택해 주세요.',
    };
  }

  if (isHeicOrHeifFile(file)) {
    return {
      valid: false,
      errorMessage:
        '아이폰 HEIC/HEIF 원본 파일은 브라우저에서 직접 변환되지 않습니다. 아이폰 사진(HEIC)은 카카오톡으로 PC에 전송하거나 구글 포토에서 JPG로 다운로드(또는 카메라 설정 > 포맷 > 높은 호환성) 후 업로드해 주세요.',
    };
  }

  if (!isSupportedImageFile(file)) {
    return {
      valid: false,
      errorMessage: `지원하지 않는 파일 형식입니다. 허용 형식: ${PHOTO_UPLOAD_SPECS.supportedFormatsLabel} (${PHOTO_UPLOAD_SPECS.heicGuideText})`,
    };
  }

  if (file.size > PHOTO_UPLOAD_SPECS.maxFileSizeBytes) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      errorMessage: `사진 용량(${sizeMB}MB)이 최대 허용 크기(${PHOTO_UPLOAD_SPECS.maxFileSizeMB}MB)를 초과했습니다. ${PHOTO_UPLOAD_SPECS.maxFileSizeMB}MB 이하의 JPG / PNG / WEBP 사진을 선택해 주세요.`,
    };
  }

  return { valid: true };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(new Error('사진 파일을 읽는 중 오류가 발생했습니다.'));
    reader.onload = () => {
      if (typeof reader.result === 'string' && reader.result.length > 0) {
        resolve(reader.result);
      } else {
        reject(new Error('사진 파일 데이터를 읽을 수 없습니다.'));
      }
    };
    reader.readAsDataURL(file);
  });
}

/**
 * 4. 이미지 리사이징 및 JPEG 압축 (기본 상한: 1200×900px, quality: 0.78)
 * 사진 1장당 평균 200~350KB로 최적화하여 IndexedDB 및 Firestore 클라우드 동기화를 빠르게 처리합니다.
 */
export async function processImageFileWithSpecs(
  file: File,
  maxW: number = PHOTO_UPLOAD_SPECS.autoOptimizeMaxWidth,
  maxH: number = PHOTO_UPLOAD_SPECS.autoOptimizeMaxHeight,
  quality: number = PHOTO_UPLOAD_SPECS.defaultQuality
): Promise<ProcessedPhotoResult> {
  const validation = validateImageFileBeforeUpload(file);
  if (!validation.valid) {
    throw new Error(validation.errorMessage || '지원하지 않는 이미지 파일입니다.');
  }

  const originalSizeKB = Math.max(1, Math.round(file.size / 1024));
  const rawDataUrl = await readFileAsDataUrl(file);

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const originalWidth = img.naturalWidth || img.width || maxW;
      const originalHeight = img.naturalHeight || img.height || maxH;

      let outputWidth = originalWidth;
      let outputHeight = originalHeight;

      if (outputWidth > maxW || outputHeight > maxH) {
        const ratio = Math.min(maxW / outputWidth, maxH / outputHeight);
        outputWidth = Math.max(1, Math.round(outputWidth * ratio));
        outputHeight = Math.max(1, Math.round(outputHeight * ratio));
      }

      try {
        const canvas = document.createElement('canvas');
        canvas.width = outputWidth;
        canvas.height = outputHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D context를 생성할 수 없습니다.');
        }

        // 투명 배경(PNG/WEBP)일 경우 흰색 배경 채우기 후 JPEG 압축
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, outputWidth, outputHeight);
        ctx.drawImage(img, 0, 0, outputWidth, outputHeight);

        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        // 혹시 Firestore 단일 문서 한도(1MB)에 근접할 경우 한번 더 안전하게 압축
        if (dataUrl.length > 850_000) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.65);
        }

        const outputSizeKB = Math.max(
          1,
          Math.round((dataUrl.length * 3) / 4 / 1024)
        );

        resolve({
          dataUrl,
          outputWidth,
          outputHeight,
          originalWidth,
          originalHeight,
          originalSizeKB,
          outputSizeKB,
          fileName: file.name || 'site-photo.jpg',
          specSummary: `${outputWidth}×${outputHeight}px (${outputSizeKB}KB 최적화 · 원본 ${originalWidth}×${originalHeight}px)`,
        });
      } catch (err) {
        reject(
          err instanceof Error
            ? err
            : new Error('이미지 리사이징·압축 중 오류가 발생했습니다.')
        );
      }
    };

    img.onerror = () => {
      reject(
        new Error(
          `이미지를 디코딩할 수 없습니다. 지원 형식(${PHOTO_UPLOAD_SPECS.supportedFormatsLabel})인지 확인해 주세요. (${PHOTO_UPLOAD_SPECS.heicGuideText})`
        )
      );
    };

    img.src = rawDataUrl;
  });
}

/**
 * 하위 호환용 헬퍼 함수
 */
export async function fileToOptimizedDataUrl(
  file: File,
  maxW: number = PHOTO_UPLOAD_SPECS.autoOptimizeMaxWidth,
  quality: number = PHOTO_UPLOAD_SPECS.defaultQuality
): Promise<string> {
  const res = await processImageFileWithSpecs(
    file,
    maxW,
    PHOTO_UPLOAD_SPECS.autoOptimizeMaxHeight,
    quality
  );
  return res.dataUrl;
}

/**
 * 개발 서버(ais-dev)와 배포 서버(ais-pre) 간 정적 번들 이미지 경로 차이를 자동 보정합니다.
 * 사용자가 직접 업로드한 사진(data:image/...)은 그대로 유지하고,
 * 기본 내장 사진은 현재 빌드의 SERVICES_DATA 에셋 URL로 매칭합니다.
 */
function normalizeStaticAssetUrls(services: ServiceItem[]): ServiceItem[] {
  return services.map((srv) => {
    const defaultSrv = SERVICES_DATA.find((d) => d.id === srv.id);
    return {
      ...srv,
      photos: (srv.photos || []).map((photo) => {
        if (
          photo.url &&
          (photo.url.startsWith('data:image/') ||
            photo.url.startsWith('blob:') ||
            photo.url.startsWith(FIRESTORE_PHOTO_REF_PREFIX))
        ) {
          return photo;
        }
        const defaultPhoto =
          defaultSrv?.photos.find((dp) => dp.id === photo.id) ||
          defaultSrv?.photos[0];
        if (defaultPhoto) {
          return {
            ...photo,
            url: defaultPhoto.url,
          };
        }
        return photo;
      }),
    };
  });
}

function openGalleryDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB is not supported in this browser.'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const dbInstance = request.result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function parseSavedServices(raw: unknown): ServiceItem[] {
  if (!raw) return [];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? normalizeStaticAssetUrls(parsed as ServiceItem[]) : [];
    } catch {
      return [];
    }
  }
  if (Array.isArray(raw)) {
    return normalizeStaticAssetUrls(raw as ServiceItem[]);
  }
  return [];
}

/**
 * 로컬 IndexedDB에서 저장된 갤러리 읽기
 */
async function loadLocalCustomGallery(): Promise<ServiceItem[]> {
  try {
    const idb = await openGalleryDb();
    const rawRecord = await new Promise<unknown>((resolve, reject) => {
      const tx = idb.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(RECORD_KEY);
      req.onsuccess = () => {
        if (req.result !== undefined && req.result !== null) {
          resolve(req.result);
        } else {
          const legacyReq = store.get(LEGACY_RECORD_KEY);
          legacyReq.onsuccess = () => resolve(legacyReq.result ?? null);
          legacyReq.onerror = () => resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });

    const parsed = parseSavedServices(rawRecord);
    if (parsed.length > 0) {
      return parsed;
    }
  } catch {
    // IndexedDB 접근 실패 시 localStorage 폴백
  }

  try {
    const localRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const parsedLocal = parseSavedServices(localRaw);
    if (parsedLocal.length > 0) {
      return parsedLocal;
    }
  } catch {
    // Ignore
  }

  return [];
}

/**
 * 로컬 IndexedDB에만 저장 (내부 헬퍼)
 */
async function saveLocalCustomGalleryOnly(services: ServiceItem[]): Promise<void> {
  const jsonStr = JSON.stringify(services);
  if (jsonStr.length > MAX_INDEXEDDB_BYTES) {
    throw new Error(
      '저장 가능한 사진 용량(40MB)을 초과했습니다. 일부 사진을 삭제해 주세요.'
    );
  }

  try {
    const idb = await openGalleryDb();
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(jsonStr, RECORD_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, jsonStr);
    } catch {
      // Ignore secondary local storage quota error if Firestore succeeds
    }
  }
}

/**
 * Firestore의 gallery_config/main 문서 및 gallery_photos 컬렉션에서
 * 전체 서비스 갤러리를 복원(Hydrate)합니다.
 */
async function hydrateServicesFromFirestoreConfig(
  servicesJson: string
): Promise<ServiceItem[]> {
  const rawServices = parseSavedServices(servicesJson);
  if (rawServices.length === 0) return [];

  // 참조된 모든 커스텀 사진 ID 수집
  const photoRefsToFetch: { serviceId: string; photoId: string; expectedLen?: number }[] = [];

  for (const srv of rawServices) {
    for (const photo of srv.photos || []) {
      if (photo.url && photo.url.startsWith(FIRESTORE_PHOTO_REF_PREFIX)) {
        const rest = photo.url.slice(FIRESTORE_PHOTO_REF_PREFIX.length);
        const [photoId, lenStr] = rest.split(':');
        const expectedLen = lenStr ? parseInt(lenStr, 10) : undefined;
        const cached = photoDataUrlMemoryCache.get(photoId);

        if (!cached || (expectedLen && cached.length !== expectedLen)) {
          photoRefsToFetch.push({ serviceId: srv.id, photoId, expectedLen });
        }
      } else if (photo.url && photo.url.startsWith('data:image/')) {
        photoDataUrlMemoryCache.set(photo.id, photo.url);
      }
    }
  }

  if (photoRefsToFetch.length > 0) {
    await Promise.all(
      photoRefsToFetch.map(async ({ photoId }) => {
        try {
          const photoSnap = await getDoc(doc(db, FIRESTORE_PHOTOS_COLLECTION, photoId));
          if (photoSnap.exists()) {
            const data = photoSnap.data();
            if (typeof data?.dataUrl === 'string' && data.dataUrl.length > 0) {
              photoDataUrlMemoryCache.set(photoId, data.dataUrl);
            }
          }
        } catch (err) {
          console.warn(`Failed to fetch photo ${photoId} from Firestore:`, err);
        }
      })
    );
  }

  // 복원된 사진 URL을 주입
  const hydrated = rawServices.map((srv) => {
    const defaultSrv = SERVICES_DATA.find((d) => d.id === srv.id);
    return {
      ...srv,
      photos: (srv.photos || []).map((photo) => {
        if (photo.url && photo.url.startsWith(FIRESTORE_PHOTO_REF_PREFIX)) {
          const rest = photo.url.slice(FIRESTORE_PHOTO_REF_PREFIX.length);
          const [photoId] = rest.split(':');
          const resolvedDataUrl = photoDataUrlMemoryCache.get(photoId);
          if (resolvedDataUrl) {
            return { ...photo, url: resolvedDataUrl };
          }
          // 만약 네트워크 지연 등으로 못 가져왔다면 기본 이미지로 안전하게 폴백
          const fallbackPhoto =
            defaultSrv?.photos.find((dp) => dp.id === photo.id) ||
            defaultSrv?.photos[0];
          return {
            ...photo,
            url: fallbackPhoto ? fallbackPhoto.url : photo.url,
          };
        }
        return photo;
      }),
    };
  });

  return normalizeStaticAssetUrls(hydrated);
}

/**
 * Firestore에 전체 갤러리 및 커스텀 시공 사진들을 실시간 동기화 저장합니다.
 * 사진별로 개별 문서(gallery_photos/{photoId})에 분리 저장하여
 * 사진을 수십 장 등록해도 Firestore 1MB 문서 제한에 절대 걸리지 않습니다.
 */
export async function syncGalleryToCloud(services: ServiceItem[]): Promise<void> {
  const now = Date.now();
  lastLocalWriteTimestamp = now;

  const photoUploadPromises: Promise<void>[] = [];

  const lightweightServices: ServiceItem[] = services.map((srv) => ({
    ...srv,
    photos: (srv.photos || []).map((photo) => {
      if (photo.url && photo.url.startsWith('data:image/')) {
        const cachedDataUrl = photoDataUrlMemoryCache.get(photo.id);
        if (cachedDataUrl !== photo.url) {
          photoDataUrlMemoryCache.set(photo.id, photo.url);
          const photoDocRef = doc(db, FIRESTORE_PHOTOS_COLLECTION, photo.id);
          photoUploadPromises.push(
            setDoc(photoDocRef, {
              id: photo.id,
              serviceId: srv.id,
              dataUrl: photo.url,
              subtitle: photo.subtitle || '',
              specNote: photo.specNote || '',
              updatedAt: now,
            })
          );
        }
        return {
          ...photo,
          url: `${FIRESTORE_PHOTO_REF_PREFIX}${photo.id}:${photo.url.length}`,
        };
      }
      return photo;
    }),
  }));

  if (photoUploadPromises.length > 0) {
    await Promise.all(photoUploadPromises);
  }

  const configDocRef = doc(db, FIRESTORE_CONFIG_COLLECTION, FIRESTORE_CONFIG_DOC_ID);
  await setDoc(configDocRef, {
    servicesJson: JSON.stringify(lightweightServices),
    updatedAt: now,
    updatedBy: CLIENT_SESSION_ID,
  });
}

/**
 * 5. 갤러리 불러오기: Firestore 클라우드에서 최신 데이터를 우선 로드하고,
 * 오프라인이거나 클라우드가 비어있을 경우 로컬 IndexedDB 데이터를 반환합니다.
 */
export async function loadCustomGallery(): Promise<ServiceItem[]> {
  const localSaved = await loadLocalCustomGallery();

  try {
    const configDocRef = doc(db, FIRESTORE_CONFIG_COLLECTION, FIRESTORE_CONFIG_DOC_ID);
    const snap = await getDoc(configDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (typeof data?.servicesJson === 'string') {
        const cloudServices = await hydrateServicesFromFirestoreConfig(data.servicesJson);
        if (cloudServices.length > 0) {
          await saveLocalCustomGalleryOnly(cloudServices);
          return cloudServices;
        }
      }
    } else if (localSaved.length > 0) {
      // 클라우드가 아직 비어있고 로컬 브라우저(IndexedDB)에 대표님이 수정해둔 사진이 있다면 자동으로 클라우드에 최초 업로드!
      syncGalleryToCloud(localSaved).catch((err) =>
        console.warn('Initial cloud migration warning:', err)
      );
      return localSaved;
    }
  } catch (err) {
    console.warn('Firestore load fallback to IndexedDB:', err);
  }

  return localSaved;
}

/**
 * 6. 로컬 IndexedDB 및 Firebase Firestore 클라우드에 동시 저장
 * 저장 즉시 사이트에 접속한 모든 사용자에게 실시간으로 반영됩니다.
 */
export async function saveCustomGallery(services: ServiceItem[]): Promise<void> {
  await saveLocalCustomGalleryOnly(services);
  await syncGalleryToCloud(services);
}

/**
 * 7. 기본값 복원: 로컬 IndexedDB 및 Firestore 클라우드 설정 초기화
 */
export async function clearCustomGallery(): Promise<ServiceItem[]> {
  try {
    const idb = await openGalleryDb();
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(RECORD_KEY);
      store.delete(LEGACY_RECORD_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('IndexedDB clear failed', e);
  }

  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem('jeongseok_custom_services_v1');
  } catch {
    // Ignore
  }

  const defaults = SERVICES_DATA.map((srv) => ({
    ...srv,
    photos: srv.photos.map((p) => ({ ...p })),
  }));

  try {
    await syncGalleryToCloud(defaults);
  } catch (e) {
    console.warn('Firestore reset sync failed', e);
  }

  return defaults;
}

/**
 * 8. 모든 방문자(PC/스마트폰)를 위한 Firebase 실시간 구독 (onSnapshot)
 * 대표님이 사진이나 소제목을 수정하면 접속 중인 모든 사용자의 화면이 즉시 자동 갱신됩니다.
 */
export function subscribeToCloudGallery(
  onReceiveCloudServices: (services: ServiceItem[]) => void,
  onSyncStateChange?: (state: CloudSyncState) => void
): () => void {
  onSyncStateChange?.('connecting');
  const configDocRef = doc(db, FIRESTORE_CONFIG_COLLECTION, FIRESTORE_CONFIG_DOC_ID);

  const unsubscribe = onSnapshot(
    configDocRef,
    async (snapshot) => {
      if (!snapshot.exists()) {
        // 클라우드에 아직 데이터가 없으면 로컬 IndexedDB에 저장된 데이터가 있는지 확인 후 자동 업로드
        const localSaved = await loadLocalCustomGallery();
        if (localSaved.length > 0) {
          onReceiveCloudServices(localSaved);
          try {
            onSyncStateChange?.('syncing');
            await syncGalleryToCloud(localSaved);
            onSyncStateChange?.('synced');
          } catch {
            onSyncStateChange?.('error');
          }
        } else {
          // 기본 데이터도 최초 1회 클라우드에 등록해두어 모든 방문자가 동일한 상태를 보도록 함
          onSyncStateChange?.('synced');
        }
        return;
      }

      const data = snapshot.data();
      // 현재 브라우저 세션에서 방금(2.5초 이내) 직접 저장한 이벤트라면 타이핑 커서 튐 방지를 위해 상태 덮어쓰기 생략
      if (
        data?.updatedBy === CLIENT_SESSION_ID &&
        Math.abs(Date.now() - lastLocalWriteTimestamp) < 2500
      ) {
        onSyncStateChange?.('synced');
        return;
      }

      if (typeof data?.servicesJson === 'string') {
        try {
          const cloudServices = await hydrateServicesFromFirestoreConfig(data.servicesJson);
          if (cloudServices.length > 0) {
            await saveLocalCustomGalleryOnly(cloudServices);
            onReceiveCloudServices(cloudServices);
          }
          onSyncStateChange?.('synced');
        } catch (err) {
          console.warn('Error hydrating cloud gallery snapshot:', err);
          onSyncStateChange?.('error');
        }
      }
    },
    (error) => {
      console.warn('Firestore real-time listener error:', error);
      onSyncStateChange?.('offline');
    }
  );

  return unsubscribe;
}
