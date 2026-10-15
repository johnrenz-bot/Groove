'use client';

import React from 'react';
import Image from 'next/image';
import { Play, ExternalLink } from 'lucide-react';
import { cn } from '@/components/shared/cn';

interface VideoCardProps {
  videoUrl: string;
  title: string;
  thumbnailUrl?: string;
  crewName: string;
}

export function VideoCard({ videoUrl, title, thumbnailUrl, crewName }: VideoCardProps) {
  // Extract YouTube video ID for thumbnail
  const getVideoId = (url: string): string | null => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  };

  const videoId = getVideoId(videoUrl);
  const thumbUrl = thumbnailUrl || (videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null);

  return (
    <div className="rounded-2xl border border-[#2A2823] bg-[#151515] overflow-hidden transition-all duration-200 hover:border-[#8F7335] hover:bg-[#1A160D]">
      <div className="relative aspect-video">
        {thumbUrl ? (
          <Image
            src={thumbUrl}
            alt={`${crewName} - ${title}`}
            fill
            className="object-cover transition-transform duration-500 hover:scale-105"
            sizes="100%"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#101010]">
            <div className="text-center text-[#A39B87]">
              <Play className="h-8 w-8 mx-auto mb-2 text-[#D4B366]/50" aria-hidden="true" />
              <p className="text-sm">No thumbnail available</p>
            </div>
          </div>
        )}

        {/* Play button overlay */}
        <button
          type="button"
          onClick={() => window.open(videoUrl, '_blank', 'noopener,noreferrer')}
          className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity duration-200"
          aria-label={`Play ${title} on YouTube`}
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[#D4B366] opacity-20 blur-xl" aria-hidden="true" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#D4B366] text-[#0A0A0A] shadow-lg">
              <Play className="h-7 w-7 ml-1" aria-hidden="true" />
            </div>
          </div>
        </button>

        {/* Dark gradient overlay at bottom for text readability */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 to-transparent" aria-hidden="true" />
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#D4B366] mb-2">
          <Play className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Official Performance Video</span>
        </div>

        <h4 className="font-serif text-lg font-semibold text-[#F3EEDF] leading-snug mb-3 whitespace-normal break-words">
          {title}
        </h4>

        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-[#D4B366] hover:text-[#E2C887] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4B366] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
          aria-label={`View ${title} on YouTube`}
        >
          <span>View on YouTube</span>
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}

export default VideoCard;