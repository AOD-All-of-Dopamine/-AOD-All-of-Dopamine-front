import { useEffect, useRef, type RefObject } from "react";
import { ImpressionMeter, type ImpressionSnapshot, type RecEventFields } from "@aod/shared/tracking";
import { useTracker } from "./trackerContext";

/**
 * 카드 노출 계측 (REC_TAB_DESIGN §5-4): 50% 이상 보인 누적 1초에 1회 + 최종값 1회 → impression_viewed.
 * fields 가 null 이거나 impressionId·contentId 가 둘 다 없으면 재지 않는다. 같은 카드는 impressionId(없으면 contentId)로 구분한다.
 */
export function useImpressionTracker(ref: RefObject<Element | null>, fields: RecEventFields | null): void {
  const tracker = useTracker();
  const fieldsRef = useRef(fields);
  // 렌더 중에 ref 를 쓰지 않는다 — 커밋된 값만 담기도록 effect 에서 갱신한다 (아래 관찰 effect 보다 먼저 선언)
  useEffect(() => {
    fieldsRef.current = fields;
  });
  const id = fields?.impressionId ?? fields?.contentId;
  const key = id === undefined ? null : String(id);

  useEffect(() => {
    const el = ref.current;
    if (!el || key === null || typeof IntersectionObserver === "undefined") return;

    const now = () => performance.now();
    const meter = new ImpressionMeter();
    const pageVisible = () => document.visibilityState === "visible";
    let ratio = 0;
    let timer: number | undefined;

    const emit = (snap: ImpressionSnapshot | null) => {
      const current = fieldsRef.current;
      if (snap && current) tracker.track("impression_viewed", { ...current, payload: { ...snap } });
    };
    // 기준(1초)을 채우는 시각에 깨어나도록 타이머를 건다 — 교차 비율이 안 바뀌면 옵저버는 다시 안 부른다
    const arm = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = undefined;
      const ms = meter.msUntilThreshold(now());
      if (ms === null) return;
      timer = window.setTimeout(() => {
        timer = undefined;
        emit(meter.tick(now()));
      }, ms + 5);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        ratio = entries[entries.length - 1].intersectionRatio;
        emit(meter.update(ratio, pageVisible(), now()));
        if (ratio === 0) emit(meter.leave(now()));
        arm();
      },
      { threshold: [0, 0.5, 1] },
    );
    observer.observe(el);

    const onVisibility = () => {
      emit(meter.update(ratio, pageVisible(), now()));
      arm();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const finish = () => emit(meter.finish(now()));
    const offFinalizer = tracker.addFinalizer(finish);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      if (timer !== undefined) window.clearTimeout(timer);
      offFinalizer();
      finish();
    };
  }, [tracker, ref, key]);
}
