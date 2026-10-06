'use client';

import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Eraser, Check, FileSignature, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface SignaturePadModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => Promise<void>;
}

export function SignaturePadModal({
  title,
  isOpen,
  onClose,
  onSave,
}: SignaturePadModalProps) {
  const sigPadRef = useRef<SignatureCanvas>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClear = () => {
    sigPadRef.current?.clear();
    setError(null);
  };

  const handleSave = async () => {
    if (sigPadRef.current?.isEmpty()) {
      setError('Please draw your signature before saving.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const dataUrl = sigPadRef.current?.getTrimmedCanvas().toDataURL('image/png');
      if (dataUrl) {
        await onSave(dataUrl);
        onClose();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save signature.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <span className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-accent-border bg-accent-soft text-accent-text">
            <FileSignature className="h-4 w-4" />
          </span>
          {title}
        </span>
      }
      description="Draw your signature using your mouse, trackpad, or finger below."
      footer={
        <>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleClear}
            icon={<Eraser className="h-3.5 w-3.5" />}
          >
            Clear
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            loading={saving}
            onClick={handleSave}
            icon={<Check className="h-3.5 w-3.5" />}
          >
            {saving ? 'Saving' : 'Apply signature'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-soft p-3 text-xs text-danger">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-inner">
          <SignatureCanvas
            ref={sigPadRef}
            penColor="#0F172A"
            canvasProps={{
              width: 500,
              height: 200,
              className: 'sigCanvas cursor-crosshair w-full h-[180px] bg-white touch-none',
            }}
          />
        </div>

        <p className="text-xs text-subtle-foreground">
          By applying your signature you confirm this digital agreement is binding.
        </p>
      </div>
    </Modal>
  );
}

export default SignaturePadModal;