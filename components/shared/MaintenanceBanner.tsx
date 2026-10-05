'use client';

import React from 'react';
import { createClient } from '@/lib/supabase/client';
import { MaintenanceNotice } from '@/lib/types';
import { AlertCircle, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export function MaintenanceBanner() {
  const [notice, setNotice] = useState<MaintenanceNotice | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const fetchMaintenance = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('maintenance_notices')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setNotice(data);
      }
    };
    fetchMaintenance();
  }, []);

  if (!notice || dismissed) return null;

  return (
    <div className="flex w-full items-center justify-between gap-4 border-b border-warning/30 bg-warning-soft px-4 py-2.5 text-xs sm:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <AlertCircle className="h-4 w-4 shrink-0 text-warning" />
        <span className="truncate">
          <span className="font-semibold text-warning">
            {notice.title || 'System Maintenance'}:
          </span>{' '}
          <span className="text-warning">{notice.message}</span>
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 cursor-pointer rounded-md p-1 text-warning hover:bg-warning hover:text-warning"
        aria-label="Dismiss notice"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default MaintenanceBanner;