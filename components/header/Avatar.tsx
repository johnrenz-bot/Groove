'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { getInitials } from '@/lib/utils';
import type { Profile } from '@/lib/types';

/**
 * Avatar with a real loading state.
 */
export function Avatar({ user, size = 34 }: { user: Profile; size?: number }) {
  if (!user.photo_url) {
    return (
      <span
        className="hx-avatar"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        {getInitials(user.firstname, user.lastname)}
      </span>
    );
  }
  return <AvatarImage key={user.photo_url} user={user} size={size} />;
}

function AvatarImage({ user, size }: { user: Profile; size: number }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  return (
    <span
      className="hx-avatar-frame"
      data-state={status}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Image
        src={user.photo_url as string}
        alt=""
        width={size}
        height={size}
        className="hx-avatar-img"
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
      />
      {status !== 'loaded' && (
        <>
          <span className="hx-avatar hx-avatar--fallback">
            {getInitials(user.firstname, user.lastname)}
          </span>
          {status === 'loading' && <span className="hx-avatar-shimmer" aria-hidden="true" />}
        </>
      )}
    </span>
  );
}
