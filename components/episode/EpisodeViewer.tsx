'use client';

import { useState, useRef, useEffect } from 'react';

// 모바일 감지 훅
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

interface EpisodeViewerProps {
  episodeNumber: number;
  title: string;
  content: string;              // 작가 원본
  editedContent?: string;       // 환님 수정본
  charCount: number;
  status: 'planned' | 'drafted' | 'reviewed' | 'final';
  onPartialEdit: (selectedText: string, feedback: string) => void;
  onFullFeedback: (feedback: string) => void;
  onDirectEdit: (newContent: string) => void;  // 직접 편집 저장
  onAdopt: () => void;
  isLoading?: boolean;
}

export default function EpisodeViewer({
  episodeNumber,
  title,
  content,
  editedContent,
  charCount,
  status,
  onPartialEdit,
  onFullFeedback,
  onDirectEdit,
  onAdopt,
  isLoading = false,
}: EpisodeViewerProps) {
  const [selectedText, setSelectedText] = useState('');
  const [selectionPosition, setSelectionPosition] = useState<{ top: number; left: number } | null>(null);
  const [showPartialEditInput, setShowPartialEditInput] = useState(false);
  const [partialEditFeedback, setPartialEditFeedback] = useState('');
  const [showFullFeedbackInput, setShowFullFeedbackInput] = useState(false);
  const [fullFeedback, setFullFeedback] = useState('');

  // 직접 편집 모드
  const [isEditMode, setIsEditMode] = useState(false);
  const [editText, setEditText] = useState('');

  const contentRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 모바일 감지
  const isMobile = useIsMobile();

  // 표시할 본문 (수정본 우선)
  const displayContent = editedContent ?? content;
  const isEdited = !!editedContent;

  // 편집 모드 시작
  const enterEditMode = () => {
    if (status === 'final' || isLoading) return;
    setEditText(displayContent);
    setIsEditMode(true);
  };

  // 편집 모드 종료 (저장)
  const saveEdit = () => {
    const trimmedText = editText.trim();
    if (trimmedText && trimmedText !== content) {
      onDirectEdit(trimmedText);
    }
    setIsEditMode(false);
  };

  // 편집 모드 취소
  const cancelEdit = () => {
    setIsEditMode(false);
    setEditText('');
  };

  // 편집 모드에서 textarea 자동 높이 조절
  useEffect(() => {
    if (isEditMode && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
      textareaRef.current.focus();
    }
  }, [isEditMode, editText]);

  // 텍스트 선택 감지
  const handleMouseUp = () => {
    if (isEditMode) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      if (!showPartialEditInput) {
        setSelectedText('');
        setSelectionPosition(null);
      }
      return;
    }

    const text = selection.toString().trim();
    if (text.length > 0 && contentRef.current?.contains(selection.anchorNode)) {
      setSelectedText(text);

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const containerRect = contentRef.current.getBoundingClientRect();

      setSelectionPosition({
        top: rect.top - containerRect.top - 40,
        left: rect.left - containerRect.left + rect.width / 2,
      });
    }
  };

  // 부분 수정 제출
  const handlePartialEditSubmit = () => {
    if (selectedText && partialEditFeedback.trim()) {
      onPartialEdit(selectedText, partialEditFeedback.trim());
      setShowPartialEditInput(false);
      setPartialEditFeedback('');
      setSelectedText('');
      setSelectionPosition(null);
    }
  };

  // 전체 피드백 제출
  const handleFullFeedbackSubmit = () => {
    if (fullFeedback.trim()) {
      onFullFeedback(fullFeedback.trim());
      setShowFullFeedbackInput(false);
      setFullFeedback('');
    }
  };

  // ESC로 입력창 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditMode) {
          cancelEdit();
        } else {
          setShowPartialEditInput(false);
          setShowFullFeedbackInput(false);
          setSelectedText('');
          setSelectionPosition(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditMode]);

  const isFinal = status === 'final';

  return (
    <div className="rounded-xl border border-base-border bg-base-card overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-base-border bg-base-secondary px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-lg font-medium text-text-primary">
            {episodeNumber}화
          </span>
          <span className="text-text-secondary">{title}</span>
          <span className="rounded-full bg-base-tertiary px-2 py-0.5 text-xs text-text-muted">
            {(isEditMode ? editText.length : displayContent.length).toLocaleString()}자
          </span>
          {isEdited && !isEditMode && (
            <span className="rounded-full bg-seojin/20 px-2 py-0.5 text-xs text-seojin">
              수정됨
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isEditMode ? (
            <span className="text-sm text-blue-500">편집 중...</span>
          ) : isFinal ? (
            <span className="flex items-center gap-1 text-sm text-seojin">
              <span>✓</span> 채택됨
            </span>
          ) : (
            <span className="text-sm text-yellow-500">수정 중</span>
          )}
        </div>
      </div>

      {/* 본문 */}
      {isEditMode ? (
        // 편집 모드
        <div className="p-4">
          <textarea
            ref={textareaRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full min-h-[400px] rounded-lg border border-base-border bg-base-primary p-4 text-[17px] leading-[2] text-[#333] focus:border-seojin focus:outline-none resize-none"
            placeholder="본문을 직접 수정하세요..."
          />
          <div className="mt-3 flex justify-between items-center">
            <span className="text-xs text-text-muted">
              ESC로 취소 | 직접 편집하면 다음 화 집필에 반영됩니다
            </span>
            <div className="flex gap-2">
              <button
                onClick={cancelEdit}
                className="rounded-lg border border-base-border px-4 py-2 text-sm text-text-secondary hover:bg-base-tertiary"
              >
                취소
              </button>
              <button
                onClick={saveEdit}
                className="rounded-lg bg-seojin px-4 py-2 text-sm font-medium text-white hover:bg-seojin/90"
              >
                수정 완료
              </button>
            </div>
          </div>
        </div>
      ) : (
        // 읽기 모드
        <div
          ref={contentRef}
          onMouseUp={handleMouseUp}
          onDoubleClick={!isFinal ? enterEditMode : undefined}
          className="relative p-6 novel-preview-area min-h-[300px] max-h-[500px] overflow-y-auto cursor-text"
          style={{ userSelect: isFinal ? 'none' : 'text' }}
        >
          {/* 선택 팝업 */}
          {selectionPosition && !showPartialEditInput && !isFinal && (
            <div
              className={`z-10 animate-fade-in ${
                isMobile
                  ? 'fixed bottom-24 left-4 right-4 flex justify-center'
                  : 'absolute -translate-x-1/2'
              }`}
              style={isMobile ? {} : { top: selectionPosition.top, left: selectionPosition.left }}
            >
              <button
                onClick={() => setShowPartialEditInput(true)}
                className="rounded-lg bg-seojin px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-seojin/90 min-h-[44px]"
              >
                이 부분 수정
              </button>
            </div>
          )}

          {/* 부분 수정 입력창 */}
          {showPartialEditInput && (
            <div
              className={`z-20 rounded-lg border border-seojin/30 bg-base-card p-3 shadow-xl ${
                isMobile
                  ? 'fixed bottom-24 left-4 right-4'
                  : 'absolute w-80 -translate-x-1/2'
              }`}
              style={isMobile ? {} : { top: (selectionPosition?.top || 0) + 50, left: selectionPosition?.left || 0 }}
            >
              <div className="mb-2 text-xs text-text-muted">선택한 부분:</div>
              <div className="mb-3 max-h-20 overflow-y-auto rounded bg-base-tertiary p-2 text-sm text-text-secondary">
                &ldquo;{selectedText.length > 100 ? selectedText.slice(0, 100) + '...' : selectedText}&rdquo;
              </div>
              <input
                type="text"
                value={partialEditFeedback}
                onChange={(e) => setPartialEditFeedback(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePartialEditSubmit()}
                placeholder="수정 방향 입력 (예: 더 짧게, 삭제, 감정 추가)"
                autoFocus
                className="w-full rounded-lg border border-base-border bg-base-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-seojin focus:outline-none min-h-[44px]"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowPartialEditInput(false);
                    setSelectedText('');
                    setSelectionPosition(null);
                  }}
                  className="rounded px-3 py-2 text-sm text-text-muted hover:text-text-primary min-h-[44px]"
                >
                  취소
                </button>
                <button
                  onClick={handlePartialEditSubmit}
                  disabled={!partialEditFeedback.trim()}
                  className="rounded bg-seojin px-4 py-2 text-sm text-white hover:bg-seojin/90 disabled:opacity-50 min-h-[44px]"
                >
                  수정 요청
                </button>
              </div>
            </div>
          )}

          {/* 본문 내용 */}
          <div className="novel-content whitespace-pre-wrap text-[17px] leading-[2] text-[#333]">
            {displayContent.split('\n').map((paragraph, idx) => (
              <p key={idx} className="novel-paragraph mb-4 indent-4">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* 하단 액션 버튼 */}
      {!isFinal && !isEditMode && (
        <div className="border-t border-base-border bg-base-secondary p-4">
          {/* 전체 피드백 입력창 */}
          {showFullFeedbackInput && (
            <div className="mb-4">
              <textarea
                value={fullFeedback}
                onChange={(e) => setFullFeedback(e.target.value)}
                placeholder="전체적인 피드백을 입력하세요 (예: 톤이 너무 가벼워, 태민의 성격이 안 맞아)"
                rows={3}
                autoFocus
                className="w-full rounded-lg border border-base-border bg-base-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-seojin focus:outline-none resize-none"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={() => setShowFullFeedbackInput(false)}
                  className="rounded px-3 py-2 text-sm text-text-muted hover:text-text-primary min-h-[44px]"
                >
                  취소
                </button>
                <button
                  onClick={handleFullFeedbackSubmit}
                  disabled={!fullFeedback.trim() || isLoading}
                  className="rounded bg-seojin px-4 py-2 text-sm text-white hover:bg-seojin/90 disabled:opacity-50 min-h-[44px]"
                >
                  피드백 전송
                </button>
              </div>
            </div>
          )}

          {/* 버튼들 */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="hidden md:block text-xs text-text-muted">
              더블클릭하면 직접 편집 | 드래그하면 부분 수정
            </div>
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              <div className="flex gap-2">
                <button
                  onClick={enterEditMode}
                  disabled={isLoading}
                  className="flex-1 md:flex-none rounded-lg border border-base-border px-4 py-2 text-sm text-text-secondary hover:bg-base-tertiary disabled:opacity-50 min-h-[44px]"
                >
                  직접 편집
                </button>
                <button
                  onClick={() => setShowFullFeedbackInput(true)}
                  disabled={isLoading || showFullFeedbackInput}
                  className="flex-1 md:flex-none rounded-lg border border-base-border px-4 py-2 text-sm text-text-secondary hover:bg-base-tertiary disabled:opacity-50 min-h-[44px]"
                >
                  전체 피드백
                </button>
              </div>
              <button
                onClick={onAdopt}
                disabled={isLoading}
                className="rounded-lg bg-seojin px-4 py-2 text-sm font-medium text-white hover:bg-seojin/90 disabled:opacity-50 min-h-[44px]"
              >
                {isLoading ? '처리 중...' : '채택 → 다음 화'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
