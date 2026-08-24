import { useEffect, useRef, useState } from 'react';
import type { MomentDraft } from '../../domain/types';
import { ACCEPTED_MOMENT_TYPES, formatFileSize, validateMomentUpload } from './validation';

interface MomentsPanelProps {
  onDraftCreated: (draft: MomentDraft) => void;
  onToast: (message: string) => void;
}

interface LocalPreview {
  url: string;
  fileName: string;
  mediaType: string;
  size: number;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `moment-${Date.now()}`;
}

export function MomentsPanel({ onDraftCreated, onToast }: MomentsPanelProps) {
  const [open, setOpen] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [preview, setPreview] = useState<LocalPreview | null>(null);
  const [previewMessage, setPreviewMessage] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (preview?.url) {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, [preview]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onEscClose = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onEscClose);
    return () => window.removeEventListener('keydown', onEscClose);
  }, [open]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0] ?? null;
    const validation = validateMomentUpload(file, consentChecked);
    if (!validation.ok || !file) {
      onToast(validation.message);
      event.target.value = '';
      return;
    }

    if (preview?.url) {
      URL.revokeObjectURL(preview.url);
    }

    const localUrl = URL.createObjectURL(file);
    const nextPreview: LocalPreview = {
      url: localUrl,
      fileName: file.name,
      mediaType: file.type,
      size: file.size,
    };
    setPreview(nextPreview);
    setPreviewMessage(validation.message);

    onDraftCreated({
      id: generateId(),
      fileName: file.name,
      mediaType: file.type,
      size: file.size,
      status: 'pending_review',
      createdAt: new Date().toISOString(),
    });

    onToast(validation.message);
    event.target.value = '';
  };

  const inputAccept = ACCEPTED_MOMENT_TYPES.join(',');

  return (
    <section className="moment-wrap" aria-labelledby="moments-heading">
      <div className="moment-head">
        <div>
          <h3 id="moments-heading">오늘 특새 영상</h3>
          <p>촬영 파일은 자동 공개되지 않고 운영팀 검수 대기 상태로만 기록됩니다.</p>
        </div>
        <button type="button" className="camera-btn" onClick={() => setOpen((prev) => !prev)}>
          2초 영상 올리기
        </button>
      </div>

      <div className="moments" aria-label="기본 예시 장면">
        <article className="moment scene1">
          <span className="moment-tag">공식</span>
          <div className="moment-info">
            <div className="moment-time">03:52</div>
            <div className="moment-place">송림 본당 앞 · 문 열림 안내</div>
          </div>
        </article>
        <article className="moment scene2">
          <span className="moment-tag">현장</span>
          <div className="moment-info">
            <div className="moment-time">04:07</div>
            <div className="moment-place">드림센터 · 안내팀 준비</div>
          </div>
        </article>
        <article className="moment scene3">
          <span className="moment-tag">현장</span>
          <div className="moment-info">
            <div className="moment-time">04:14</div>
            <div className="moment-place">체육관 · 예배 준비</div>
          </div>
        </article>
        <article className="moment scene4">
          <span className="moment-tag">온라인</span>
          <div className="moment-info">
            <div className="moment-time">04:18</div>
            <div className="moment-place">온라인 · 같은 시간 함께 예배</div>
          </div>
        </article>
      </div>

      {open && (
        <div className="share-panel open" role="region" aria-label="영상 업로드 패널">
          <p>
            얼굴, 차량번호, 아이 이름이 보이지 않도록 촬영해 주세요.
            <br />
            서버 업로드는 아직 연결되지 않았고, 지금은 이 기기에서만 검수 대기 상태를 확인할 수 있습니다.
          </p>
          <label className="consent">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(event) => setConsentChecked(event.target.checked)}
            />
            <span>영상에 나온 분들이 교회 내부 공유에 동의했습니다.</span>
          </label>

          <label className="file-label">
            촬영하거나 파일 선택
            <input
              ref={inputRef}
              type="file"
              accept={inputAccept}
              onChange={handleFileChange}
              disabled={!consentChecked}
            />
          </label>

          {!consentChecked && (
            <p className="file-hint" role="status">
              동의를 체크하면 파일 선택이 열립니다.
            </p>
          )}

          {preview && (
            <div className="uploaded-preview show" role="status">
              <strong>검수 대기:</strong> {preview.fileName} ({preview.mediaType},{' '}
              {formatFileSize(preview.size)})<br />
              {previewMessage}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
