import { useEffect, useState } from "react";

const QUERY = "(min-width: 1024px)";

/**
 * lg(1024px) 이상인지 - 같은 내용을 lg+ 는 옆 패널, <lg 는 바텀시트·하단 카드로 그릴 때 쓴다.
 * 모양만 다르면 CSS(lg:hidden)로 충분하다. 이 훅은 "어느 표면을 여느냐"가 갈릴 때만.
 */
export function useIsLg(): boolean {
  const [isLg, setIsLg] = useState(() => window.matchMedia(QUERY).matches);
  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = () => setIsLg(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isLg;
}
