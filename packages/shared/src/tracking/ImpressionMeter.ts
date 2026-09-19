export const IMPRESSION_MIN_RATIO = 0.5;
export const IMPRESSION_MIN_MS = 1000;

/** impression_viewed 의 payload. 기준은 분석에서 바꿀 수 있게 원값을 그대로 싣는다. */
export interface ImpressionSnapshot {
  max_visible_ratio: number;
  visible_ms: number;
  final: boolean;
}

/**
 * 카드 1장의 노출 계측 (REC_TAB_DESIGN §5-4). 시각(ms)은 전부 호출자가 넘긴다.
 * 카드당 최대 2건: 기준(50%·1초)을 넘는 순간 1회 + 최종값 1회.
 */
export class ImpressionMeter {
  /** "50% 이상 + 페이지 보임" 구간이 시작된 시각. 그 상태가 아니면 null */
  private countingSince: number | null = null;
  private visibleMs = 0;
  private maxRatio = 0;
  private thresholdSent = false;
  private finished = false;

  /** 교차 비율이나 페이지 가시성이 바뀔 때마다 부른다. 기준을 막 넘었으면 스냅샷을 돌려준다. */
  update(ratio: number, pageVisible: boolean, nowMs: number): ImpressionSnapshot | null {
    if (this.finished) return null;
    this.accumulate(nowMs);
    if (ratio > this.maxRatio) this.maxRatio = ratio;
    this.countingSince = ratio >= IMPRESSION_MIN_RATIO && pageVisible ? nowMs : null;
    return this.checkThreshold();
  }

  /** msUntilThreshold 로 건 타이머가 깨어나면 부른다. */
  tick(nowMs: number): ImpressionSnapshot | null {
    if (this.finished) return null;
    this.accumulate(nowMs);
    return this.checkThreshold();
  }

  /** 기준까지 남은 시간. 세는 중이 아니거나 이미 알렸으면 null. */
  msUntilThreshold(nowMs: number): number | null {
    if (this.finished || this.thresholdSent || this.countingSince === null) return null;
    const soFar = this.visibleMs + Math.max(0, nowMs - this.countingSince);
    return Math.max(0, IMPRESSION_MIN_MS - soFar);
  }

  /** 카드가 화면을 완전히 벗어났을 때. 기준을 넘긴 뒤라면 최종값을 내고 끝낸다. */
  leave(nowMs: number): ImpressionSnapshot | null {
    return this.thresholdSent ? this.finish(nowMs) : null;
  }

  /** 페이지를 떠나거나 컴포넌트가 사라질 때 한 번. 한 번도 보인 적 없으면 null. */
  finish(nowMs: number): ImpressionSnapshot | null {
    if (this.finished) return null;
    this.accumulate(nowMs);
    this.finished = true;
    this.countingSince = null;
    if (this.maxRatio <= 0) return null;
    return { max_visible_ratio: this.maxRatio, visible_ms: Math.round(this.visibleMs), final: true };
  }

  private accumulate(nowMs: number): void {
    if (this.countingSince === null) return;
    this.visibleMs += Math.max(0, nowMs - this.countingSince);
    this.countingSince = nowMs;
  }

  private checkThreshold(): ImpressionSnapshot | null {
    if (this.thresholdSent || this.visibleMs < IMPRESSION_MIN_MS) return null;
    this.thresholdSent = true;
    return { max_visible_ratio: this.maxRatio, visible_ms: Math.round(this.visibleMs), final: false };
  }
}
