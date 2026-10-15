'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export interface SupportCalloutProps {
  onSubmitTicket: () => void;
}

export function SupportCallout({ onSubmitTicket }: SupportCalloutProps) {
  return (
    <Card
      padding="md"
      className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"
    >
      <div className="space-y-1.5">
        <h3 className="text-sm font-bold text-foreground">Need Support or Have Feedback?</h3>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Our administration team is available to assist with studio listings, scheduling, and
          verified coaches.
        </p>
      </div>
      <Button type="button" variant="outline" className="shrink-0" onClick={onSubmitTicket}>
        Submit Ticket
      </Button>
    </Card>
  );
}

export default SupportCallout;
