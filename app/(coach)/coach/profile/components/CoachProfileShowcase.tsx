'use client';

import { ImageIcon } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProfileMediaGrid } from '@/features/community/components/SignedMedia';
import type { CommunityPost } from '@/lib/types';

interface CoachProfileShowcaseProps {
  posts: CommunityPost[];
}

export function CoachProfileShowcase({ posts }: CoachProfileShowcaseProps) {
  if (posts.length === 0) {
    return (
      <EmptyState
        icon={<ImageIcon className="h-5 w-5" />}
        title="No media posts yet"
        description="Share your choreography, performances, and workshop highlights!"
        action="Go to Coach Showcase Feed"
        actionHref="/coach/talents"
      />
    );
  }

  return (
    <ProfileMediaGrid
      items={posts}
      emptyState={
        <EmptyState
          icon={<ImageIcon className="h-5 w-5" />}
          title="No media yet"
          description="Your posts have text but no media. Share one from the showcase feed."
          action="Go to Coach Showcase Feed"
          actionHref="/coach/talents"
        />
      }
    />
  );
}
