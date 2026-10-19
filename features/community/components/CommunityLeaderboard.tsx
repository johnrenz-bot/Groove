'use client';

/**
 * Community Leaderboard for Groove Performing Arts & Dance Circles.
 *
 * Provides:
 *   - Role-aware rankings for Dancers, Coaches, and Clients based on real available participation data.
 *   - Transparent points system derived from:
 *       * Community showcase posts (+50 pts)
 *       * Community reactions received/given (+10 pts)
 *       * Comments & studio discussions (+5 pts)
 *       * Verified performer/coach badge (+100 pts)
 *   - Profile avatars, role tags, and discipline badges.
 *   - Privacy-respecting: only public display names and community stats are shown.
 *   - Matching GrooveSystem dark theme.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Award,
  Crown,
  Flame,
  Heart,
  Loader2,
  Medal,
  MessageCircle,
  RefreshCw,
  Share2,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { getInitials } from '@/lib/utils';
import { cn } from '@/components/shared/cn';

export interface LeaderboardUser {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: 'coach' | 'client' | 'admin';
  city: string;
  discipline: string;
  verified: boolean;
  postsCount: number;
  reactsCount: number;
  commentsCount: number;
  totalPoints: number;
  tier: string;
}

export interface CommunityLeaderboardProps {
  className?: string;
  compact?: boolean;
}

export function CommunityLeaderboard({ className, compact = false }: CommunityLeaderboardProps) {
  const { t } = useLanguage();
  const [roleFilter, setRoleFilter] = useState<'all' | 'coach' | 'client'>('all');
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // In-flight guard to prevent duplicate concurrent queries
  const inFlightRef = useRef(false);
  const isMountedRef = useRef(true);

  const fetchLeaderboardData = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      if (isMountedRef.current) {
        setLoading(true);
        setError(null);
      }

      const supabase = createClient();

      // Fetch active profiles with coach & client detail associations.
      // Use account_verified (the actual column in public.profiles schema).
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          firstname,
          lastname,
          role,
          photo_url,
          city_name,
          address_summary,
          account_verified,
          coach_profile:coach_profiles(talents, service_fee),
          client_profile:client_profiles(talent)
        `)
        .in('role', ['client', 'coach'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (profilesError) {
        throw profilesError;
      }

      // Fetch posts counts grouped by author_id (handle errors gracefully)
      const { data: posts, error: postsError } = await supabase
        .from('community_posts')
        .select('author_id')
        .is('deleted_at', null);

      if (postsError) {
        console.warn('[CommunityLeaderboard] community_posts warning:', postsError.message);
      }

      // Fetch reactions counts from post_reacts table
      const { data: reacts, error: reactsError } = await supabase
        .from('post_reacts')
        .select('user_id');

      if (reactsError) {
        console.warn('[CommunityLeaderboard] post_reacts warning:', reactsError.message);
      }

      // Fetch comments counts from comments table
      const { data: comments, error: commentsError } = await supabase
        .from('comments')
        .select('user_id');

      if (commentsError) {
        console.warn('[CommunityLeaderboard] comments warning:', commentsError.message);
      }

      const postsMap = new Map<string, number>();
      (posts || []).forEach((p) => {
        if (p?.author_id) {
          postsMap.set(p.author_id, (postsMap.get(p.author_id) || 0) + 1);
        }
      });

      const reactsMap = new Map<string, number>();
      (reacts || []).forEach((r) => {
        if (r?.user_id) {
          reactsMap.set(r.user_id, (reactsMap.get(r.user_id) || 0) + 1);
        }
      });

      const commentsMap = new Map<string, number>();
      (comments || []).forEach((c) => {
        if (c?.user_id) {
          commentsMap.set(c.user_id, (commentsMap.get(c.user_id) || 0) + 1);
        }
      });

      // Calculate transparent participation scores from real database records
      const leaderboard: LeaderboardUser[] = (profiles || []).map((prof: any) => {
        const postsCount = postsMap.get(prof.id) || 0;
        const reactsCount = reactsMap.get(prof.id) || 0;
        const commentsCount = commentsMap.get(prof.id) || 0;
        const isVerified = Boolean(prof.account_verified ?? prof.verified);

        // Participation scoring formula:
        // +50 per post, +10 per reaction, +5 per comment, +100 for verified credential badge
        const totalPoints =
          postsCount * 50 +
          reactsCount * 10 +
          commentsCount * 5 +
          (isVerified ? 100 : 0);

        // Normalize single-object vs array relational join outputs
        const coachProfile = Array.isArray(prof.coach_profile)
          ? prof.coach_profile[0]
          : prof.coach_profile;
        const clientProfile = Array.isArray(prof.client_profile)
          ? prof.client_profile[0]
          : prof.client_profile;

        // Determine discipline label
        let discipline = 'Performing Arts';
        if (prof.role === 'coach' && coachProfile?.talents) {
          discipline = coachProfile.talents;
        } else if (clientProfile?.talent && clientProfile.talent !== 'N/A') {
          discipline = clientProfile.talent;
        } else if (prof.role === 'coach') {
          discipline = 'Coaching & Mentorship';
        } else {
          discipline = 'Dance & Stage Arts';
        }

        // Determine role-aware tier label
        let tier = 'Community Performer';
        if (prof.role === 'coach') {
          tier = isVerified ? 'Verified Master Mentor' : 'Studio Instructor';
        } else if (totalPoints >= 150) {
          tier = 'Lead Showcase Artist';
        } else if (postsCount > 0) {
          tier = 'Active Performer';
        } else {
          tier = 'Community Member';
        }

        const fullName = `${prof.firstname || ''} ${prof.lastname || ''}`.trim() || 'Performer';
        const city = prof.city_name || prof.address_summary || 'San Jose del Monte';

        return {
          id: prof.id,
          name: fullName,
          avatarUrl: prof.photo_url || null,
          role: prof.role || 'client',
          city,
          discipline,
          verified: isVerified,
          postsCount,
          reactsCount,
          commentsCount,
          totalPoints,
          tier,
        };
      });

      // Sort by points descending with deterministic tie-breaking
      leaderboard.sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (b.postsCount !== a.postsCount) return b.postsCount - a.postsCount;
        if (b.reactsCount !== a.reactsCount) return b.reactsCount - a.reactsCount;
        return a.name.localeCompare(b.name);
      });

      if (isMountedRef.current) {
        setUsers(leaderboard);
      }
    } catch (err: unknown) {
      let errorMessage = 'Unable to calculate community leaderboard.';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
        const pgErr = err as { message?: string; details?: string; hint?: string; code?: string };
        errorMessage = pgErr.message || pgErr.details || JSON.stringify(err);
      }

      console.error('[CommunityLeaderboard] Error calculating community leaderboard:', errorMessage, err);

      if (isMountedRef.current) {
        setError('Failed to load leaderboard rankings. Please check your connection and retry.');
      }
    } finally {
      inFlightRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    void fetchLeaderboardData();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchLeaderboardData]);

  const filteredUsers = useMemo(() => {
    if (roleFilter === 'all') return users;
    return users.filter((u) => u.role === roleFilter);
  }, [users, roleFilter]);

  const displayedUsers = compact ? filteredUsers.slice(0, 5) : filteredUsers.slice(0, 15);

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm backdrop-blur-md',
        className
      )}
    >
      {/* Header */}
      <div className="border-b border-border/70 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500 border border-amber-500/30">
              <Trophy className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground sm:text-base flex items-center gap-1.5">
                <span>{t('showcase.leaderboardTitle', 'Tambayan Leaderboard')}</span>
                <span className="rounded bg-accent/15 px-1.5 py-0.2 text-[10px] font-extrabold text-accent-text">
                  SJDM
                </span>
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {t('showcase.leaderboardSubtitle', 'Ranked by verified participation, rehearsal posts & community support')}
              </p>
            </div>
          </div>

          {/* Quick Refresh Button */}
          <button
            type="button"
            onClick={() => void fetchLeaderboardData()}
            disabled={loading}
            aria-label="Refresh leaderboard"
            title="Refresh leaderboard rankings"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/70 bg-card text-muted-foreground transition hover:border-border hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin text-accent')} />
          </button>
        </div>

        {/* Role Filters */}
        <div className="mt-3.5 flex gap-1 rounded-xl border border-border/70 bg-muted/40 p-1">
          {[
            { id: 'all', label: t('showcase.tabAll', 'All Circles') },
            { id: 'client', label: t('showcase.tabClients', 'Dancers & Clients') },
            { id: 'coach', label: t('showcase.tabCoaches', 'Mentors & Coaches') },
          ].map((tab) => {
            const active = roleFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRoleFilter(tab.id as any)}
                className={cn(
                  'flex-1 rounded-lg py-1 text-center text-xs font-semibold transition cursor-pointer',
                  active
                    ? 'bg-card text-foreground shadow-xs border border-border/60'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Users List & State Containers */}
      <div className="p-3 sm:p-4">
        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
            <span className="text-xs">{t('showcase.calculating', 'Calculating participation points�')}</span>
          </div>
        ) : error ? (
          <div className="py-6 px-4 text-center">
            <p className="text-xs text-rose-400 dark:text-rose-300 mb-3">{error}</p>
            <button
              type="button"
              onClick={() => void fetchLeaderboardData()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted active:scale-95 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>{t('common.retry', 'Retry')}</span>
            </button>
          </div>
        ) : displayedUsers.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            {t('showcase.leaderboardEmpty', 'No ranked members yet. Be the first to post!')}
          </div>
        ) : (
          <div className="space-y-2">
            {displayedUsers.map((user, idx) => {
              const rank = idx + 1;
              const isTop1 = rank === 1;
              const isTop2 = rank === 2;
              const isTop3 = rank === 3;

              return (
                <div
                  key={user.id}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-xl border p-2.5 transition',
                    isTop1
                      ? 'border-amber-500/40 bg-amber-500/5 ring-1 ring-amber-500/20'
                      : isTop2
                        ? 'border-slate-400/40 bg-slate-400/5'
                        : isTop3
                          ? 'border-amber-700/30 bg-amber-700/5'
                          : 'border-border/60 bg-muted/20 hover:border-border'
                  )}
                >
                  {/* Rank & User Info */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Rank Badge */}
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center font-bold text-xs">
                      {isTop1 ? (
                        <Crown className="h-5 w-5 text-amber-500" />
                      ) : isTop2 ? (
                        <Medal className="h-5 w-5 text-slate-300" />
                      ) : isTop3 ? (
                        <Medal className="h-5 w-5 text-amber-700" />
                      ) : (
                        <span className="font-mono text-muted-foreground">#{rank}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-border/80 bg-muted">
                      {user.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center font-bold text-[11px] text-muted-foreground">
                          {getInitials(user.name)}
                        </div>
                      )}
                      {user.verified && (
                        <div className="absolute -bottom-0.5 -right-0.5 rounded-full bg-accent p-0.5 text-accent-foreground" title="Verified Member">
                          <ShieldCheck className="h-2.5 w-2.5" />
                        </div>
                      )}
                    </div>

                    {/* Name & Discipline */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="truncate text-xs font-bold text-foreground">
                          {user.name}
                        </span>
                        {user.role === 'coach' && (
                          <span className="rounded bg-sky-500/15 px-1 text-[9px] font-bold text-sky-400 border border-sky-500/30">
                            Coach
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {user.discipline} · {user.city}
                      </p>
                    </div>
                  </div>

                  {/* Points & Stats */}
                  <div className="text-right shrink-0">
                    <div className="flex items-center justify-end gap-1 font-mono text-xs font-extrabold text-accent-text">
                      <Sparkles className="h-3 w-3 text-accent" />
                      <span>{user.totalPoints} pts</span>
                    </div>
                    <div className="flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
                      <span>{user.postsCount} posts</span>
                      <span>·</span>
                      <span>{user.reactsCount} reacts</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="border-t border-border/60 bg-muted/20 px-4 py-2.5 text-center text-[10px] text-muted-foreground">
        {t('showcase.pointsLegend', 'Points: +50 per post � +10 per reaction � +5 per comment � +100 verified badge')}
      </div>
    </div>
  );
}

export default CommunityLeaderboard;

