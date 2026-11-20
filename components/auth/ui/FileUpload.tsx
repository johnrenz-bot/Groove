'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertCircle,
  Check,
  FileText,
  Image as ImageIcon,
  Loader2,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImagePreviewModal } from './Modal';

/* ==========================================================================
   UPLOAD KIT
   --------------------------------------------------------------------------
   The pages keep owning validation and the File objects; these components
   only present the idle / drag / upload / success / error states.
   ========================================================================== */

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function usePreviewUrl(file: File | null) {
  const url = React.useMemo(() => {
    if (!file || !file.type.startsWith('image/')) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  return url;
}

function extensionBadges(accept?: string) {
  if (!accept) return ['JPG', 'PNG', 'PDF'];
  const labels = accept
    .split(',')
    .map((value) => value.trim().replace(/^\./, '').toUpperCase())
    .filter(Boolean);
  return Array.from(new Set(labels)).slice(0, 4);
}

export interface FileUploadProps {
  id: string;
  label: string;
  hint?: string;
  accept?: string;
  file: File | null;
  /** Return an error message to reject the file, or null to accept it. */
  onSelect: (file: File) => string | null;
  onRemove: () => void;
  error?: string | null;
  disabled?: boolean;
  required?: boolean;
  icon?: React.ElementType;
  uploading?: boolean;
  /** 0-100, or null for an indeterminate bar. */
  progress?: number | null;
  maxLabel?: string;
  className?: string;
}

export function FileUpload({
  id,
  label,
  hint,
  accept,
  file,
  onSelect,
  onRemove,
  error,
  disabled = false,
  required = false,
  icon: Icon = UploadCloud,
  uploading = false,
  progress = null,
  maxLabel = 'Max 5 MB',
  className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const preview = usePreviewUrl(file);
  const reduceMotion = useReducedMotion();

  const shownError = error || localError;
  const state = dragging
    ? 'dragging'
    : shownError
      ? 'error'
      : uploading
        ? 'uploading'
        : file
          ? 'success'
          : 'idle';

  const acceptFile = (next: File | null | undefined) => {
    if (!next || disabled) return;
    const message = onSelect(next);
    if (message) {
      setLocalError(message);
      setShake((value) => value + 1);
      return;
    }
    setLocalError(null);
  };

  const resetInput = () => {
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className={cn('rw-upload', className)} data-state={state} data-shake={shake}>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        disabled={disabled || uploading}
        tabIndex={-1}
        className="rw-upload-input"
        aria-label={`Upload ${label}`}
        aria-describedby={shownError ? `${id}-error` : `${id}-hint`}
        onChange={(event) => {
          acceptFile(event.target.files?.[0]);
          resetInput();
        }}
      />

      <motion.div
        key={shake}
        initial={false}
        animate={
          shake > 0 && !reduceMotion ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }
        }
        transition={{ duration: 0.4 }}
        className="rw-upload-shell"
        onDragOver={(event) => {
          if (disabled) return;
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          if (disabled) return;
          event.preventDefault();
          setDragging(false);
          acceptFile(event.dataTransfer.files?.[0]);
        }}
      >
        {!file ? (
          <div
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-disabled={disabled || undefined}
            className="rw-upload-drop"
            onClick={() => {
              if (!disabled) inputRef.current?.click();
            }}
            onKeyDown={(event) => {
              if (disabled) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
          >
            <span className="rw-upload-icon" aria-hidden="true">
              <Icon className="h-6 w-6" />
            </span>
            <span className="rw-upload-copy">
              <span className="rw-upload-title">
                {dragging ? 'Drop to upload' : label}
              </span>
              <span className="rw-upload-hint">
                {dragging ? 'Release the file to attach it.' : hint}
              </span>
            </span>
            <span className="rw-upload-badges" aria-hidden="true">
              {extensionBadges(accept).map((badge) => (
                <span key={badge}>{badge}</span>
              ))}
              <span>{maxLabel}</span>
              {required ? <span>Required</span> : <span>Optional</span>}
            </span>
          </div>
        ) : (
          <div className="rw-filecard">
            {preview ? (
              <button
                type="button"
                className="rw-filethumb"
                onClick={() => setPreviewOpen(true)}
                aria-label={`Preview ${file.name}`}
              >
                <img src={preview} alt="" />
                <span className="rw-filethumb-zoom" aria-hidden="true">
                  <ImageIcon className="h-3.5 w-3.5" />
                </span>
              </button>
            ) : (
              <span className="rw-fileicon" aria-hidden="true">
                <FileText className="h-5 w-5" />
              </span>
            )}

            <span className="rw-filemeta">
              <strong title={file.name}>{file.name}</strong>
              <span>
                {formatBytes(file.size)}
                {uploading
                  ? progress != null
                    ? ` · Uploading ${Math.round(progress)}%`
                    : ' · Uploading…'
                  : ' · Ready'}
              </span>
            </span>

            {uploading ? (
              <Loader2 className="rw-file-spinner h-4 w-4" aria-hidden="true" />
            ) : (
              <span className="rw-filecheck" aria-hidden="true">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
            )}

            <span className="rw-fileacts">
              <button
                type="button"
                className="rw-fileact"
                disabled={disabled || uploading}
                onClick={(event) => {
                  event.stopPropagation();
                  inputRef.current?.click();
                }}
              >
                Replace
              </button>
              <button
                type="button"
                className="rw-fileact rw-fileact--danger"
                disabled={disabled || uploading}
                onClick={(event) => {
                  event.stopPropagation();
                  setLocalError(null);
                  onRemove();
                  resetInput();
                }}
                aria-label={`Remove ${label}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="sr-only">Remove</span>
              </button>
            </span>

            {uploading ? (
              <span className="rw-progress-line" data-indeterminate={progress == null || undefined}>
                <span
                  className="rw-progress-line-fill"
                  style={progress == null ? undefined : { width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </span>
            ) : null}
          </div>
        )}
      </motion.div>

      {shownError ? (
        <p id={`${id}-error`} className="rw-upload-error" role="alert">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{shownError}</span>
          <button
            type="button"
            className="rw-upload-retry"
            onClick={() => {
              setLocalError(null);
              inputRef.current?.click();
            }}
            disabled={disabled}
          >
            Retry
          </button>
        </p>
      ) : (
        <p id={`${id}-hint`} className="rw-upload-foot">
          {file ? 'Stored securely. You can replace this file before submitting.' : hint}
        </p>
      )}

      <ImagePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        src={preview}
        name={file?.name ?? label}
      />
    </div>
  );
}

/* ─── Multi-file upload ─────────────────────────────────────────────────── */

function MultiItem({
  file,
  index,
  onRemove,
  disabled,
}: {
  file: File;
  index: number;
  onRemove: (index: number) => void;
  disabled?: boolean;
}) {
  const preview = usePreviewUrl(file);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 12, scale: 0.98 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="rw-multi-item"
    >
      {preview ? (
        <img src={preview} alt="" className="rw-multi-thumb" />
      ) : (
        <span className="rw-multi-icon" aria-hidden="true">
          <FileText className="h-4 w-4" />
        </span>
      )}
      <span className="rw-multi-meta">
        <strong title={file.name}>{file.name}</strong>
        <span>{formatBytes(file.size)}</span>
      </span>
      <span className="rw-filecheck" aria-hidden="true">
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
      <button
        type="button"
        className="rw-icon-btn rw-multi-remove"
        disabled={disabled}
        onClick={() => onRemove(index)}
        aria-label={`Remove ${file.name}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </motion.li>
  );
}

export function MultiFileUpload({
  id,
  label,
  hint,
  accept,
  files,
  onAdd,
  onRemove,
  error,
  disabled = false,
  maxLabel = 'Max 5 MB each',
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  accept?: string;
  files: File[];
  /** Return an error message to reject the selection, or null to accept it. */
  onAdd: (files: File[]) => string | null;
  onRemove: (index: number) => void;
  error?: string | null;
  disabled?: boolean;
  maxLabel?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const addFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const message = onAdd(Array.from(list));
    if (message) setLocalError(message);
    else setLocalError(null);
  };

  return (
    <div className={cn('rw-multi', className)} data-state={dragging ? 'dragging' : undefined}>
      <div className="rw-multi-head">
        <span className="rw-multi-title">
          <ShieldCheck className="h-4 w-4 text-[var(--av-accent)]" aria-hidden="true" />
          {label}
          <span className="rw-multi-count">{files.length}</span>
        </span>
        <span className="rw-multi-max">{maxLabel}</span>
      </div>

      <input
        ref={inputRef}
        id={id}
        type="file"
        multiple
        accept={accept}
        disabled={disabled}
        tabIndex={-1}
        className="rw-upload-input"
        onChange={(event) => {
          addFiles(event.target.files);
          if (inputRef.current) inputRef.current.value = '';
        }}
      />

      <AnimatePresence initial={false}>
        {files.length > 0 ? (
          <motion.ul layout className="rw-multi-list">
            {files.map((file, index) => (
              <MultiItem
                key={`${file.name}-${file.size}-${index}`}
                file={file}
                index={index}
                onRemove={onRemove}
                disabled={disabled}
              />
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        className={cn('rw-multi-add', dragging && 'is-dragging')}
        onClick={() => {
          if (!disabled) inputRef.current?.click();
        }}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          if (disabled) return;
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          if (disabled) return;
          event.preventDefault();
          setDragging(false);
          addFiles(event.dataTransfer.files);
        }}
      >
        <UploadCloud className="h-4 w-4" aria-hidden="true" />
        <span>{dragging ? 'Drop to add files' : files.length > 0 ? 'Add another file' : 'Drag and drop or browse'}</span>
        {hint ? <span className="rw-multi-hint">{hint}</span> : null}
      </div>

      {error || localError ? (
        <p className="rw-upload-error" role="alert">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error || localError}</span>
        </p>
      ) : null}
    </div>
  );
}

