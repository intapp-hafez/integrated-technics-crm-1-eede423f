import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useStoreState, actions, type Lead } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { fmtMoney } from "@/lib/mock-data";
import { CheckCircle2, ChevronRight, X, ExternalLink, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = "intcrm:approved_widget_pos";

export function PendingApprovalFloatingWidget() {
  const { dir, lang } = useI18n();
  const isAr = lang === "ar";
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const storeState = useStoreState();
  const leads: Lead[] = Array.isArray(storeState?.leads) ? storeState.leads : [];
  const pendingLeads: Lead[] = leads.filter((l: Lead) => Boolean(l?.pendingWonApproval));
  const count = pendingLeads.length;

  // Floating coordinates state
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  const widgetRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    hasMoved: boolean;
  }>({ startX: 0, startY: 0, initialX: 0, initialY: 0, hasMoved: false });

  // Load or calculate default initial position
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          // Clamp to ensure it's on screen
          const clampedX = Math.max(12, Math.min(window.innerWidth - 76, parsed.x));
          const clampedY = Math.max(12, Math.min(window.innerHeight - 76, parsed.y));
          setPosition({ x: clampedX, y: clampedY });
          return;
        }
      }
    } catch {}

    // Default position: bottom right (or bottom left if RTL)
    const defaultX = isAr ? 24 : Math.max(20, window.innerWidth - 88);
    const defaultY = Math.max(20, window.innerHeight - 150);
    setPosition({ x: defaultX, y: defaultY });
  }, [isAr]);

  // Keep inside viewport if screen resizes
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return prev;
        const clampedX = Math.max(12, Math.min(window.innerWidth - 76, prev.x));
        const clampedY = Math.max(12, Math.min(window.innerHeight - 76, prev.y));
        return { x: clampedX, y: clampedY };
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Pointer drag handling
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return; // Only primary mouse button
    if (!position) return;

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
      hasMoved: false,
    };

    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragStartRef.current.startX;
      const deltaY = e.clientY - dragStartRef.current.startY;

      if (Math.hypot(deltaX, deltaY) > 5) {
        dragStartRef.current.hasMoved = true;
      }

      const nextX = dragStartRef.current.initialX + deltaX;
      const nextY = dragStartRef.current.initialY + deltaY;

      const clampedX = Math.max(10, Math.min(window.innerWidth - 76, nextX));
      const clampedY = Math.max(10, Math.min(window.innerHeight - 76, nextY));

      setPosition({ x: clampedX, y: clampedY });
    },
    [isDragging],
  );

  const handleClick = () => {
    if (count === 0) {
      toast.info(isAr ? "لا توجد فرص بانتظار موافقة الإدارة حالياً" : "No leads waiting for admin approval right now");
      return;
    }

    if (count === 1) {
      // Exactly 1 lead waiting: direct redirect to its details page
      const lead = pendingLeads[0];
      navigate({ to: "/admin/leads/$leadId", params: { leadId: lead.id } });
      toast.info(
        isAr
          ? `جاري فتح الفرصة: ${lead.company || lead.code}`
          : `Opening lead: ${lead.company || lead.code}`,
      );
      return;
    }

    // Multiple leads: open flyout list
    setIsFlyoutOpen((prev) => !prev);
  };

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {}

      if (position) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
        } catch {}
      }

      // If user did NOT drag, it was a click
      if (!dragStartRef.current.hasMoved) {
        handleClick();
      }
    },
    [isDragging, position, count, pendingLeads, handleClick],
  );

  const handleApproveDirectly = (e: React.MouseEvent, lead: Lead) => {
    e.stopPropagation();
    const actor = profile?.full_name_en || user?.email || "Admin";
    actions.approveWon(lead.id, actor);
    toast.success(
      isAr
        ? `تم اعتماد فوز الفرصة: ${lead.company || lead.code}`
        : `Approved as Won: ${lead.company || lead.code}`,
    );
    if (pendingLeads.length <= 1) {
      setIsFlyoutOpen(false);
    }
  };

  const handleOpenLead = (leadId: string) => {
    setIsFlyoutOpen(false);
    navigate({ to: "/admin/leads/$leadId", params: { leadId } });
  };

  if (!position) return null;

  // Flyout positioning: decide whether to open above or below, left or right
  const isNearBottom = position.y > window.innerHeight / 2;
  const isNearRight = position.x > window.innerWidth / 2;

  return (
    <div
      ref={widgetRef}
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999,
        touchAction: "none",
      }}
      className="select-none"
      dir={dir}
    >
      {/* Draggable Button with Stamp Image */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setIsDragging(false)}
        title={
          count > 0
            ? isAr
              ? `${count} فرصة بانتظار الموافقة كفائزة - اسحب للتحريك أو انقر للفتح`
              : `${count} lead(s) waiting for Won approval - Drag to move or click to view`
            : isAr
              ? "موافقات الإدارة - لا توجد طلبات معلقة (اسحب للتحريك)"
              : "Admin Approvals - No pending requests (Drag to move)"
        }
        className={`group relative flex h-16 w-16 items-center justify-center rounded-full bg-white/95 p-0 shadow-2xl transition-all duration-200 backdrop-blur-md ring-2 ${
          count > 0
            ? "ring-[#F58220] shadow-[#F58220]/25 hover:scale-110 active:scale-95"
            : "ring-[#5E5E63]/40 opacity-75 hover:opacity-100 hover:scale-105"
        } ${isDragging ? "cursor-grabbing scale-105 shadow-2xl" : "cursor-grab"}`}
      >
        {/* Waiting Approval Badge Image */}
        <img
          src="/waiting-approval-badge.png"
          alt="Waiting Approval"
          className="h-full w-full rounded-full object-cover pointer-events-none drop-shadow-sm"
          draggable={false}
        />

        {/* Counter Badge */}
        <div
          className={`absolute -top-1.5 -right-1.5 flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-black text-white shadow-md border-2 border-white pointer-events-none ${
            count > 0
              ? "bg-emerald-600 animate-pulse ring-2 ring-emerald-400/60 shadow-emerald-900/30"
              : "bg-slate-400 text-[10px]"
          }`}
        >
          {count}
        </div>

        {/* Gentle Pulse Glow Effect when count > 0 */}
        {count > 0 && !isDragging && (
          <span className="absolute -inset-1 -z-10 animate-ping rounded-full bg-[#F58220]/30 duration-1000 pointer-events-none" />
        )}
      </div>

      {/* Flyout Popover for Multiple Pending Leads */}
      {isFlyoutOpen && count > 0 && (
        <div
          className={`absolute w-80 rounded-2xl border border-border bg-card/98 p-4 shadow-2xl backdrop-blur-xl transition-all animate-in fade-in zoom-in-95 ${
            isNearBottom ? "bottom-full mb-3" : "top-full mt-3"
          } ${isNearRight ? "right-0" : "left-0"}`}
        >
          {/* Flyout Header */}
          <div className="flex items-center justify-between border-b border-border/70 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F58220]/10 text-[#F58220]">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">
                  {isAr ? "طلبات اعتماد الفوز المعلقة" : "Pending Won Approvals"}
                </h4>
                <p className="text-[10px] text-muted-foreground">
                  {isAr ? `${count} فرصة تنتظر موافقتك` : `${count} lead(s) awaiting your approval`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsFlyoutOpen(false)}
              className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Pending Leads List */}
          <div className="max-h-64 space-y-2 overflow-y-auto pe-1">
            {pendingLeads.map((lead: Lead) => (
              <div
                key={lead.id}
                onClick={() => handleOpenLead(lead.id)}
                className="group flex flex-col gap-1.5 rounded-xl border border-border/70 bg-background/50 p-2.5 transition-all hover:border-[#F58220]/50 hover:bg-[#F58220]/5 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-foreground group-hover:text-[#F58220] transition-colors line-clamp-1">
                    {lead.company || lead.code || "Lead"}
                  </span>
                  <span className="font-mono text-xs font-bold text-[#F58220]">
                    {fmtMoney(lead.value)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{lead.owner ? `👤 ${lead.owner}` : "—"}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleApproveDirectly(e, lead)}
                      className="inline-flex items-center gap-1 rounded-md bg-[#F58220] px-2 py-0.5 text-[10px] font-bold text-white shadow-xs hover:bg-[#d96e14] active:scale-95 transition-all"
                      title={isAr ? "موافقة فورية كفائزة" : "Approve as Won directly"}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {isAr ? "اعتماد" : "Approve"}
                    </button>
                    <span className="text-muted-foreground/60 hover:text-foreground p-0.5">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Flyout Footer Link */}
          <div className="mt-3 pt-2.5 border-t border-border/70 text-center">
            <button
              type="button"
              onClick={() => {
                setIsFlyoutOpen(false);
                navigate({ to: "/admin/leads" });
              }}
              className="text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-1"
            >
              {isAr ? "عرض جميع الفرص" : "View all leads in CRM"}
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
