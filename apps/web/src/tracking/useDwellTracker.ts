import { useCallback, useEffect, useRef } from "react";
import { DWELL_REPORT_MS, DwellMeter, type RecEventFields } from "@aod/shared/tracking";
import { newUuid } from "./browserIds";
import { useTracker } from "./trackerContext";

export interface DwellTarget {
  contentId: number;
  requestId?: string;
  impressionId?: string;
  surface?: string;
}

/** 이보다 짧은 체류는 보내지 않는다 — 개발 모드 StrictMode 의 즉시 언마운트가 0ms 이벤트를 만드는 것을 막는다. */
const MIN_REPORT_MS = 100;
const ACTIVITY_THROTTLE_MS = 1000;

/**
 * 상세 체류 계측 (REC_TAB_DESIGN §5-4): 15초마다 누적값, 떠날 때 최종값을 detail_viewed 로 보낸다.
 * 돌려주는 함수는 현재 detail_open_id — outbound_clicked 의 payload 에 싣는다.
 */
export function useDwellTracker(target: DwellTarget | null): () => string | null {
  const tracker = useTracker();
  const openIdRef = useRef<string | null>(null);
  const contentId = target?.contentId ?? null;
  const requestId = target?.requestId;
  const impressionId = target?.impressionId;
  const surface = target?.surface;

  useEffect(() => {
    if (contentId === null) return;

    const now = () => performance.now();
    const meter = new DwellMeter(newUuid(), now(), document.visibilityState === "visible");
    openIdRef.current = meter.detailOpenId;
    const fields: RecEventFields = { contentId, requestId, impressionId, surface };

    let lastSentMs = -1;
    const report = () => {
      const snap = meter.snapshot(now());
      if (snap.visible_ms < MIN_REPORT_MS || snap.visible_ms === lastSentMs) return;
      lastSentMs = snap.visible_ms;
      tracker.track("detail_viewed", { ...fields, payload: { ...snap } });
    };

    let lastActivityAt = -ACTIVITY_THROTTLE_MS;
    const onActivity = () => {
      const t = now();
      if (t - lastActivityAt < ACTIVITY_THROTTLE_MS) return;
      lastActivityAt = t;
      meter.activity(t);
    };
    // scrollHeight 는 레이아웃을 강제로 계산시킨다 — 스크롤 이벤트마다 읽지 않고 프레임당 한 번만 읽는다
    let scrollFrame: number | null = null;
    const onScroll = () => {
      if (scrollFrame !== null) return;
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = null;
        const height = document.documentElement.scrollHeight;
        meter.scroll(height > 0 ? (window.scrollY + window.innerHeight) / height : 0, now());
      });
    };
    const onVisibility = () => meter.setPageVisible(document.visibilityState === "visible", now());

    const passive = { passive: true } as const;
    window.addEventListener("pointerdown", onActivity, passive);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("touchstart", onActivity, passive);
    window.addEventListener("scroll", onScroll, passive);
    document.addEventListener("visibilitychange", onVisibility);
    const interval = window.setInterval(report, DWELL_REPORT_MS);
    const offFinalizer = tracker.addFinalizer(report);

    return () => {
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("touchstart", onActivity);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(interval);
      offFinalizer();
      if (scrollFrame !== null) window.cancelAnimationFrame(scrollFrame);
      report();   // 다른 화면으로 이동 — 최종값
      openIdRef.current = null;
    };
  }, [tracker, contentId, requestId, impressionId, surface]);

  return useCallback(() => openIdRef.current, []);
}
