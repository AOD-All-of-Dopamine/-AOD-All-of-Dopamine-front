import { useCallback, useRef, useState } from "react";

/**
 * 요소가 화면 가까이(300px) 오면 true 로 바뀌고 그대로 남는다.
 * 책등 질감은 CSS background-image 라 loading="lazy" 가 없다 - 100권짜리 책장이
 * 첫 화면에 이미지 100장을 받지 않게, 가까이 온 책등만 이미지를 건다.
 * 관찰자는 모듈에 하나 - 책등마다 IntersectionObserver 를 만들지 않는다.
 */
const callbacks = new WeakMap<Element, () => void>();
let observer: IntersectionObserver | undefined;

const getObserver = (): IntersectionObserver | undefined => {
  if (typeof IntersectionObserver === "undefined") return undefined;
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        callbacks.get(entry.target)?.();
        callbacks.delete(entry.target);
        observer?.unobserve(entry.target);
      }
    },
    { rootMargin: "300px" },
  );
  return observer;
};

export function useNearViewport<T extends Element>(): [
  (node: T | null) => void,
  boolean,
] {
  const [near, setNear] = useState(false);
  const nodeRef = useRef<T | null>(null);

  const ref = useCallback((node: T | null) => {
    const io = getObserver();
    if (nodeRef.current && io) {
      io.unobserve(nodeRef.current);
      callbacks.delete(nodeRef.current);
    }
    nodeRef.current = node;
    if (!node) return;
    if (!io) {
      setNear(true);
      return;
    }
    callbacks.set(node, () => setNear(true));
    io.observe(node);
  }, []);

  return [ref, near];
}
