/**
 * 카드 계열 컴포넌트가 공유하는 클래스 상수.
 * 배경(bg-surface/bg-canvas)과 레이아웃(flex/block 등)은 각 컴포넌트가 덧붙인다.
 */

/** 카드 베이스: 패널 라운드 + 라인 보더 + 카드 그림자. 정적(비링크) 카드에 단독 사용. */
export const cardBase =
  "overflow-hidden rounded-panel border border-line shadow-card";

/** 카드 베이스 + 호버 리프트. WorkCard · RailCard · GameCompactCard 공유. */
export const cardLift = `${cardBase} transition hover:-translate-y-[3px] hover:shadow-lift motion-reduce:transition-none motion-reduce:hover:translate-y-0`;

/**
 * cardLift 와 생김새는 같지만 **내용을 자르지 않는다**(overflow-hidden 없음).
 * 카드 안에서 팝오버가 카드 밖으로 나와야 할 때 쓴다 — 좁은 화면(2열, 카드 ~150px)에서
 * overflow-hidden 이 추천 카드의 더보기 메뉴를 잘라 먹는다.
 * 모서리 라운드는 카드 배경(bg-*)이 처리하고, 썸네일은 자기 상자의 overflow-hidden +
 * rounded-t-panel 로 위쪽 모서리를 맞춘다.
 */
export const cardLiftOpen =
  "rounded-panel border border-line shadow-card transition hover:-translate-y-[3px] hover:shadow-lift motion-reduce:transition-none motion-reduce:hover:translate-y-0";
