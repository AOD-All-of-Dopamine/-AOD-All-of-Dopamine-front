/**
 * 카드 계열 컴포넌트가 공유하는 클래스 상수.
 * 배경(bg-surface/bg-canvas)과 레이아웃(flex/block 등)은 각 컴포넌트가 덧붙인다.
 */

/** 카드 베이스: 패널 라운드 + 라인 보더 + 카드 그림자. 정적(비링크) 카드에 단독 사용. */
export const cardBase =
  "overflow-hidden rounded-panel border border-line shadow-card";

/** 카드 베이스 + 호버 리프트. WorkCard · RailCard · PodiumCard 공유. */
export const cardLift = `${cardBase} transition hover:-translate-y-[3px] hover:shadow-lift motion-reduce:transition-none motion-reduce:hover:translate-y-0`;
