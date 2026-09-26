import { useEffect, useRef, useState } from "react";
import { ImpressionMeter, type ImpressionSnapshot, type RecEventFields } from "@aod/shared/tracking";
import { useTracker } from "./trackerContext";

/**
 * 카드를 가르는 키. impressionId 와 contentId 를 섞지 않게 접두를 붙이고,
 * 빈 문자열 impressionId 는 없는 값으로 본다(빈 필드로 노출 이벤트가 나가지 않게).
 */
function impressionKey(fields: RecEventFields | null): string | null {
  const impressionId = fields?.impressionId?.trim();
  if (impressionId) return `i:${impressionId}`;
  const contentId = fields?.contentId;
  if (typeof contentId === "number" && Number.isFinite(contentId)) return `c:${contentId}`;
  return null;
}

/**
 * 카드 노출 계측 (REC_TAB_DESIGN §5-4): 50% 이상 보인 누적 1초에 1회 + 최종값 1회 → impression_viewed.
 * 돌려주는 값은 **콜백 ref** 다 — 요소가 effect 뒤에 붙거나 다른 노드로 바뀌어도 다시 관찰한다.
 * ```tsx
 * const setImpressionRef = useImpressionTracker(recCardFields(card, HOME_REC_SURFACE));
 * return <article ref={setImpressionRef}>…</article>;
 * ```
 * fields 가 null 이거나 impressionId·contentId 가 둘 다 없으면 재지 않는다.
 */
export function useImpressionTracker(fields: RecEventFields | null): (el: Element | null) => void {
  const tracker = useTracker();
  const fieldsRef = useRef(fields);
  // 렌더 중에 ref 를 쓰지 않는다 — 커밋된 값만 담기도록 effect 에서 갱신한다 (아래 관찰 effect 보다 먼저 선언)
  useEffect(() => {
    fieldsRef.current = fields;
  });

  const key = impressionKey(fields);
  // setElement 는 렌더마다 같은 함수라 콜백 ref 로 그대로 쓸 수 있다.
  const [element, setElement] = useState<Element | null>(null);

  useEffect(() => {
    if (!element || key === null || typeof IntersectionObserver === "undefined") return;

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
    observer.observe(element);

    const onVisibility = () => {
      emit(meter.update(ratio, pageVisible(), now()));
      arm();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // 언로드 flush 는 탭을 숨길 때마다 돈다 — finish 가 아니라 snapshot 을 낸다.
    // 그래야 탭을 떠났다 돌아와도 이 카드의 계측이 이어진다 (2번 실행 기록).
    const offFinalizer = tracker.addFinalizer(() => emit(meter.snapshot(now())));

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      if (timer !== undefined) window.clearTimeout(timer);
      offFinalizer();
      emit(meter.finish(now()));
    };
  }, [tracker, element, key]);

  return setElement;
}
