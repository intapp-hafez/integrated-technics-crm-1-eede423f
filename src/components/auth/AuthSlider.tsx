import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import logo from "@/assets/logo.png";

export interface SlideItem {
  id: string;
  image: string;
}

export const AUTH_SLIDES: SlideItem[] = [
  { id: "leads", image: "/crm5.png" },
  { id: "pipeline", image: "/crm1.png" },
  { id: "accounts", image: "/crm4.png" },
  { id: "activities", image: "/crm.png" },
  { id: "mobile", image: "/crm2.png" },
  { id: "analytics", image: "/crm3.png" },
];

interface AuthSliderProps {
  dir?: "ltr" | "rtl";
  variant?: "desktop" | "compact";
  className?: string;
}

export function AuthSlider({ dir = "ltr", variant = "desktop", className = "" }: AuthSliderProps) {
  const isAr = dir === "rtl";
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Preload all slides on mount for zero latency transitions
  useEffect(() => {
    AUTH_SLIDES.forEach((slide) => {
      const img = new Image();
      img.src = slide.image;
    });
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % AUTH_SLIDES.length);
  }, []);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + AUTH_SLIDES.length) % AUTH_SLIDES.length);
  }, []);

  // Natural direction helpers for RTL / LTR
  const handleForward = isAr ? goToPrev : goToNext;
  const handleBackward = isAr ? goToNext : goToPrev;

  // Auto-advance timer
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      goToNext();
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, goToNext]);

  // Touch swipe support for mobile / tablets
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        // Swiped left
        isAr ? goToPrev() : goToNext();
      } else {
        // Swiped right
        isAr ? goToNext() : goToPrev();
      }
    }
    setTouchStartX(null);
  };

  if (variant === "compact") {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl border border-border/70 bg-card shadow-lg ${className}`}
        dir={dir}
        onMouseEnter={() => setIsPlaying(false)}
        onMouseLeave={() => setIsPlaying(true)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Slide Image Preview */}
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted/30">
          {AUTH_SLIDES.map((slide, idx) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                idx === currentIndex ? "opacity-100 z-10 scale-100" : "opacity-0 z-0 scale-105 pointer-events-none"
              }`}
            >
              <img
                src={slide.image}
                alt={`CRM Slide ${idx + 1}`}
                className="h-full w-full object-cover object-center"
                loading="eager"
              />
            </div>
          ))}

          {/* Top Counter */}
          <div className="absolute top-3 inset-x-3 z-20 flex items-center justify-end pointer-events-none">
            <span className="text-[10px] font-semibold text-white/90 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-md border border-white/10">
              {currentIndex + 1} / {AUTH_SLIDES.length}
            </span>
          </div>
        </div>

        {/* Navigation Dots & Controls */}
        <div className="flex items-center justify-between px-3 py-2 bg-card border-t border-border/50 text-xs">
          <div className="flex items-center gap-1.5">
            {AUTH_SLIDES.map((slide, idx) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-1.5 transition-all duration-300 rounded-full ${
                  idx === currentIndex ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleBackward}
              aria-label="Previous slide"
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              aria-label={isPlaying ? "Pause autoplay" : "Play autoplay"}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={handleForward}
              aria-label="Next slide"
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop Full Panel Variant
  return (
    <div
      className={`relative flex h-full w-full flex-col justify-between overflow-hidden p-6 xl:p-10 text-white select-none ${className}`}
      dir={dir}
      onMouseEnter={() => setIsPlaying(false)}
      onMouseLeave={() => setIsPlaying(true)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Dynamic Ambient Background Blur */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {AUTH_SLIDES.map((slide, idx) => (
          <div
            key={slide.id}
            className={`absolute inset-0 bg-cover bg-center filter blur-3xl opacity-25 transition-opacity duration-1000 ease-in-out scale-125 ${
              idx === currentIndex ? "opacity-35" : "opacity-0"
            }`}
            style={{ backgroundImage: `url(${slide.image})` }}
          />
        ))}
        {/* Soft gradient masks for visual elegance */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/65" />
        <div
          className="absolute inset-0 opacity-40 mix-blend-overlay"
          style={{
            background:
              "radial-gradient(circle at 30% 20%, oklch(0.706 0.181 49.5 / 0.5), transparent 60%), radial-gradient(circle at 75% 85%, oklch(0.706 0.181 49.5 / 0.3), transparent 65%)",
          }}
        />
      </div>

      {/* Header: Logo & Branding */}
      <div className="relative z-20 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-xl shadow-black/20 ring-1 ring-white/20">
            <img src={logo} alt="Integrated Technics" className="h-8 w-8 object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl font-black tracking-tight text-white">INT-CRM</span>
              <span className="rounded-full bg-primary/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white border border-primary/40">
                v1.0
              </span>
            </div>
            <div className="text-xs uppercase tracking-[0.22em] text-white/70 font-medium">
              Integrated Technics
            </div>
          </div>
        </div>

        {/* Play/Pause & Slide counter */}
        <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur-md border border-white/15 shadow-sm">
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            aria-label={isPlaying ? "Pause auto-slide" : "Start auto-slide"}
            className="text-white/80 hover:text-white transition-colors"
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
          <span className="text-[11px] font-semibold text-white/90">
            {currentIndex + 1} / {AUTH_SLIDES.length}
          </span>
        </div>
      </div>

      {/* Main Showcase Center: Large Framed Presentation */}
      <div className="relative z-20 my-auto flex w-full items-center justify-center py-2">
        <div className="group relative w-full max-w-5xl 2xl:max-w-6xl overflow-hidden rounded-2xl border border-white/20 bg-black/40 shadow-2xl shadow-black/70 backdrop-blur-md transition-transform duration-500 hover:scale-[1.008]">
          {/* Subtle reflection sheen */}
          <div className="absolute inset-0 pointer-events-none z-20 bg-gradient-to-tr from-white/0 via-white/5 to-white/15 opacity-50" />

          {/* Slide items stack */}
          <div className="relative aspect-[16/9] w-full max-h-[76vh] overflow-hidden">
            {AUTH_SLIDES.map((slide, idx) => (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-all duration-700 ease-out ${
                  idx === currentIndex
                    ? "opacity-100 scale-100 z-10 translate-x-0"
                    : idx < currentIndex
                      ? "opacity-0 scale-98 z-0 -translate-x-4 pointer-events-none"
                      : "opacity-0 scale-98 z-0 translate-x-4 pointer-events-none"
                }`}
              >
                <img
                  src={slide.image}
                  alt={`CRM Showcase ${idx + 1}`}
                  className="h-full w-full object-cover object-center"
                  loading="eager"
                />
              </div>
            ))}
          </div>

          {/* Prev/Next overlay controls */}
          <div className="absolute inset-y-0 inset-x-3 z-30 flex items-center justify-between pointer-events-none">
            <button
              type="button"
              onClick={handleBackward}
              aria-label="Previous slide"
              className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white/90 backdrop-blur-md border border-white/20 shadow-xl transition hover:bg-black/90 hover:text-white hover:scale-110 active:scale-95"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={handleForward}
              aria-label="Next slide"
              className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white/90 backdrop-blur-md border border-white/20 shadow-xl transition hover:bg-black/90 hover:text-white hover:scale-110 active:scale-95"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer: Progress Indicators & Copyright */}
      <div className="relative z-20 flex flex-col gap-3">
        {/* Animated Progress Bars */}
        <div className="flex items-center justify-center gap-2">
          {AUTH_SLIDES.map((slide, idx) => {
            const active = idx === currentIndex;
            return (
              <button
                key={slide.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Switch to slide ${idx + 1}`}
                className="group relative py-2 focus:outline-none"
              >
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    active ? "w-10 bg-primary shadow-lg shadow-primary/50" : "w-3 bg-white/30 group-hover:bg-white/50"
                  }`}
                />
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[11px] text-white/60">
          <span>Integrated Technics © 2026</span>
          <span>Odoo 19 ERP Integration · Real-Time Operations</span>
        </div>
      </div>
    </div>
  );
}
