'use client';

import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, Play, Pause, Gauge } from 'lucide-react';
import { startMetronome, stopMetronome, updateMetronomeBpm } from '../utils/audio';

interface Props {
  initialBpm?: number;
  label?: string;
}

export const InteractivePracticeBar: React.FC<Props> = ({
  initialBpm = 108,
  label = 'Rehearsal mm. 14–32 • Patter Lab',
}) => {
  const [bpm, setBpm] = useState(initialBpm);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeBeat, setActiveBeat] = useState(0);
  const [transposition, setTransposition] = useState<'baritone' | 'score' | 'tenor'>('score');

  const getTempoLabel = (val: number) => {
    if (val < 92) return 'Andante (Slow Drill)';
    if (val < 104) return 'Moderato';
    if (val < 116) return 'Allegro Moderato (Audition)';
    return 'Presto (Hyper Drill)';
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      stopMetronome();
      setIsPlaying(false);
    } else {
      startMetronome(bpm, (beat) => {
        setActiveBeat(beat);
      });
      setIsPlaying(true);
    }
  };

  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setBpm(val);
    updateMetronomeBpm(val);
  };

  useEffect(() => {
    return () => {
      stopMetronome();
    };
  }, []);

  return (
    <div className="bg-muted/60 rounded-2xl p-4 shadow-xs space-y-3.5 border border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-full bg-accent-soft flex items-center justify-center text-accent-text border border-accent-border/50">
            <SlidersHorizontal className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-foreground tracking-tight">Interactive Practice Bar</h3>
            <span className="text-xs text-muted-foreground font-medium">{label}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleTogglePlay}
          className="px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer bg-accent text-accent-foreground hover:bg-accent-hover"
          title={isPlaying ? 'Stop metronome' : 'Start tempo drill'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isPlaying ? 'Stop Metronome' : 'Audition Tempo'}</span>
        </button>
      </div>

      {/* Metronome Speed & Audio Wave Visualization */}
      <div className="bg-card rounded-xl p-3 space-y-2.5 border border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Gauge className="w-4 h-4 text-accent" />
            <span className="text-xs text-foreground font-semibold">Target Metronome:</span>
            <span className="text-base text-accent-text font-bold font-mono">{bpm}</span>
            <span className="text-xs text-muted-foreground">BPM</span>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent-soft text-accent-text font-medium border border-accent-border/50">
            {getTempoLabel(bpm)}
          </span>
        </div>

        {/* Tempo Slider */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-mono">80</span>
          <input
            type="range"
            min={80}
            max={132}
            value={bpm}
            onChange={handleBpmChange}
            className="w-full accent-[var(--accent)] h-1.5 bg-muted rounded-lg cursor-pointer"
          />
          <span className="text-xs text-muted-foreground font-mono">132</span>
        </div>

        {/* Waveform Animation Simulation with live beat tracking */}
        <div className="h-10 bg-muted/70 rounded-lg flex items-center justify-center gap-1.5 px-3 overflow-hidden select-none border border-border">
          {[
            { h: 'h-3', peak: 'h-6' },
            { h: 'h-6', peak: 'h-8' },
            { h: 'h-4', peak: 'h-7' },
            { h: 'h-7', peak: 'h-9' },
            { h: 'h-8', peak: 'h-10' },
            { h: 'h-5', peak: 'h-8' },
            { h: 'h-3', peak: 'h-6' },
            { h: 'h-6', peak: 'h-9' },
            { h: 'h-8', peak: 'h-10' },
            { h: 'h-4', peak: 'h-7' },
            { h: 'h-5', peak: 'h-8' },
            { h: 'h-3', peak: 'h-6' },
            { h: 'h-6', peak: 'h-9' },
          ].map((bar, idx) => {
            const isBeating = isPlaying && idx % 4 === activeBeat;
            return (
              <span
                key={idx}
                className={`w-1 rounded-full transition-all duration-150 ${
                  isBeating
                    ? `${bar.peak} scale-y-125 bg-accent opacity-100`
                    : `${bar.h} bg-muted-foreground/60 opacity-60`
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Transposition Key Selector */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-muted-foreground font-medium">Transposition Key:</span>
        <div className="flex items-center bg-card rounded-full p-1 gap-1 border border-border">
          <button
            type="button"
            onClick={() => setTransposition('baritone')}
            className={`px-3 py-1 rounded-full text-xs transition-colors cursor-pointer ${
              transposition === 'baritone'
                ? 'bg-accent-soft text-accent-text font-bold shadow-xs border border-accent-border/50'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            -1 (Baritone)
          </button>
          <button
            type="button"
            onClick={() => setTransposition('score')}
            className={`px-3 py-1 rounded-full text-xs transition-colors cursor-pointer ${
              transposition === 'score'
                ? 'bg-accent-soft text-accent-text font-bold shadow-xs border border-accent-border/50'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            0 (Score Key)
          </button>
          <button
            type="button"
            onClick={() => setTransposition('tenor')}
            className={`px-3 py-1 rounded-full text-xs transition-colors cursor-pointer ${
              transposition === 'tenor'
                ? 'bg-accent-soft text-accent-text font-bold shadow-xs border border-accent-border/50'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            +1 (Tenor)
          </button>
        </div>
      </div>
    </div>
  );
};
