import { useCallback, useEffect, useRef, useState } from "react";

export interface AutoRotateOptions {
  /** 슬라이드 id (표시 순서). 늦게 도착한 슬라이드가 끼어들어도 활성 슬라이드는 id 로 붙잡는다 */
  ids: string[];
  /** 한 슬라이드가 머무는 시간 */
  intervalMs: number;
  /** 첫 회전 전 추가 대기 - 한 화면의 여러 로테이터가 동시에 넘어가지 않게 엇갈린다 */
  startDelayMs?: number;
}

export interface AutoRotate {
  currentId: string | undefined;
  /** 직전 전환의 방향 (1 = 다음 쪽에서 들어온다, -1 = 이전 쪽에서) */
  direction: 1 | -1;
  /** 지금 자동으로 넘어가는 중인가 - 진행 표시를 그릴지 정한다 */
  running: boolean;
  /** 타이머가 새로 시작될 때마다 바뀐다 - 진행 표시 애니메이션의 key */
  cycle: number;
  userPaused: boolean;
  toggleUserPaused: () => void;
  /** 사용자가 직접 고른다 (타이머는 처음부터 다시) */
  select: (id: string) => void;
  /** 로테이터 루트에 펼쳐 넣는다 - 호버·포커스·화면 안 여부를 본다 */
  bind: {
    ref: (node: HTMLElement | null) => void;
    onPointerEnter: (e: React.PointerEvent) => void;
    onPointerLeave: () => void;
    onFocus: (e: React.FocusEvent) => void;
    onBlur: (e: React.FocusEvent) => void;
  };
}

/**
 * 시간이 지나면 다음 슬라이드로 넘어가는 자동 회전.
 * 움직이는 콘텐츠는 읽는 사람을 방해하기 쉽다 - 그래서 넘어가지 **않는** 조건이 본체다:
 * 마우스를 올렸을 때 · 안에 포커스가 있을 때 · 사용자가 멈춤을 눌렀을 때 · 화면 밖일 때 ·
 * 탭이 가려졌을 때 · 슬라이드가 하나뿐일 때 · 시스템이 "동작 줄이기"일 때(이때는 아예 자동 회전이 없다).
 * 멈췄다 풀리면 그 슬라이드의 시간을 처음부터 다시 센다.
 */
export function useAutoRotate({
  ids,
  intervalMs,
  startDelayMs = 0,
}: AutoRotateOptions): AutoRotate {
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [cycle, setCycle] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const [started, setStarted] = useState(startDelayMs === 0);
  const [reducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  const index = Math.max(0, activeId === undefined ? 0 : ids.indexOf(activeId));
  const currentId = ids[index];
  const idsKey = ids.join("|");

  const running =
    ids.length > 1 &&
    started &&
    !userPaused &&
    !hovered &&
    !focused &&
    inView &&
    pageVisible &&
    !reducedMotion;

  // 화면에 처음 들어온 뒤 startDelay 만큼 기다렸다가 회전을 시작한다
  useEffect(() => {
    if (started || !inView) return;
    const timer = window.setTimeout(() => setStarted(true), startDelayMs);
    return () => window.clearTimeout(timer);
  }, [started, inView, startDelayMs]);

  useEffect(() => {
    const onVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => {
      const list = idsKey.split("|");
      setDirection(1);
      setActiveId(list[(index + 1) % list.length]);
      setCycle((c) => c + 1);
    }, intervalMs);
    return () => window.clearTimeout(timer);
    // cycle: 직접 고르면 같은 index 라도 타이머를 다시 센다
  }, [running, index, idsKey, intervalMs, cycle]);

  const select = useCallback(
    (id: string) => {
      const list = idsKey.split("|");
      const to = list.indexOf(id);
      if (to < 0 || to === index) return;
      setDirection(to > index ? 1 : -1);
      setActiveId(id);
      setCycle((c) => c + 1);
    },
    [idsKey, index],
  );

  const observerRef = useRef<IntersectionObserver | null>(null);
  const ref = useCallback((node: HTMLElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    observerRef.current = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.35 },
    );
    observerRef.current.observe(node);
  }, []);

  return {
    currentId,
    direction,
    running,
    cycle,
    userPaused,
    toggleUserPaused: () => setUserPaused((p) => !p),
    select,
    bind: {
      ref,
      // 터치는 "올려 둠"이 없다 - 마우스만 호버로 친다
      onPointerEnter: (e) => {
        if (e.pointerType === "mouse") setHovered(true);
      },
      onPointerLeave: () => setHovered(false),
      // 키보드 포커스만 멈춤으로 친다 - 마우스로 칩을 누른 뒤 포커스가 칩에 남아 회전이
      // 계속 멈춰 있지 않게 (마우스는 호버가 이미 "보고 있는 동안"을 맡는다)
      onFocus: (e) => {
        if ((e.target as Element).matches(":focus-visible")) setFocused(true);
      },
      onBlur: (e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setFocused(false);
        }
      },
    },
  };
}
