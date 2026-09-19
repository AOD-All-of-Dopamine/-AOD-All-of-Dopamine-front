import { useEffect, useRef } from "react";

const PREFIX = "aod_scroll_";

function read(key: string): number | null {
  try {
    const raw = window.sessionStorage.getItem(PREFIX + key);
    if (raw === null) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function write(key: string, y: number): void {
  try {
    window.sessionStorage.setItem(PREFIX + key, String(y));
  } catch {
    // 저장 못 해도 화면은 그대로 돈다
  }
}

/**
 * 목록 스크롤 위치를 키(칩×체인)별로 저장하고, ready 가 처음 true 가 되는 순간 복원한다.
 * 라우터에 ScrollRestoration 이 없고(App.tsx), 목록이 비동기라 브라우저 기본 복원은 빗나간다.
 * 키가 바뀌면(칩 전환·새 체인) 저장된 값이 없는 한 맨 위로 올린다.
 *
 * 저장은 **복원을 마친 뒤부터** 한다 — 로딩 중이거나 StrictMode 가 effect 를 두 번 돌릴 때
 * 0 을 덮어써서 저장해 둔 위치를 잃지 않게 하기 위함이다.
 */
export function useScrollRestore(key: string, ready: boolean): void {
  const restoredKeyRef = useRef<string | null>(null);

  useEffect(() => {
    let frame = 0;
    const save = () => {
      if (restoredKeyRef.current === key) write(key, window.scrollY);
    };
    const onScroll = () => {
      if (frame !== 0) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        save();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame !== 0) window.cancelAnimationFrame(frame);
      // 상세로 떠나기 직전 마지막 위치를 남긴다
      save();
    };
  }, [key]);

  useEffect(() => {
    if (!ready || restoredKeyRef.current === key) return;
    restoredKeyRef.current = key;
    const saved = read(key);
    if (saved === null || saved <= 0) {
      window.scrollTo({ top: 0 });
      return;
    }
    // 카드가 자리를 잡은 다음 프레임에 복원한다
    const frame = window.requestAnimationFrame(() => window.scrollTo({ top: saved }));
    return () => window.cancelAnimationFrame(frame);
  }, [key, ready]);
}
