export const DWELL_IDLE_MS = 60_000;
export const DWELL_CAP_MS = 30 * 60_000;
/** 누적값을 보내는 주기 (호출자가 쓴다) */
export const DWELL_REPORT_MS = 15_000;

/** detail_viewed 의 payload. 서버·분석은 같은 detail_open_id 의 최댓값을 쓴다. */
export interface DwellSnapshot {
  detail_open_id: string;
  visible_ms: number;
  max_scroll_ratio: number;
  /** 무입력 정지나 30분 상한이 한 번이라도 걸렸다 */
  idle_capped: boolean;
}

/** 상세 페이지 1회 열람의 체류 계측 (REC_TAB_DESIGN §5-4). 시각(ms)은 전부 호출자가 넘긴다. */
export class DwellMeter {
  private visibleMs = 0;
  private countingSince: number | null;
  private lastActivity: number;
  private pageVisible: boolean;
  private maxScroll = 0;
  private capped = false;

  constructor(
    readonly detailOpenId: string,
    nowMs: number,
    pageVisible = true,
  ) {
    this.lastActivity = nowMs;
    this.pageVisible = pageVisible;
    this.countingSince = pageVisible ? nowMs : null;
  }

  setPageVisible(visible: boolean, nowMs: number): void {
    this.advance(nowMs);
    this.pageVisible = visible;
    if (!visible) {
      this.countingSince = null;
      return;
    }
    this.lastActivity = nowMs;   // 탭으로 돌아온 것은 입력으로 친다
    this.resume(nowMs);
  }

  /** 포인터·키·터치 등 사용자 입력 */
  activity(nowMs: number): void {
    this.advance(nowMs);
    this.lastActivity = nowMs;
    this.resume(nowMs);
  }

  /** ratio = (스크롤 위치 + 뷰포트 높이) / 문서 높이. 입력으로도 친다. */
  scroll(ratio: number, nowMs: number): void {
    const clamped = Math.min(1, Math.max(0, ratio));
    if (clamped > this.maxScroll) this.maxScroll = clamped;
    this.activity(nowMs);
  }

  snapshot(nowMs: number): DwellSnapshot {
    this.advance(nowMs);
    return {
      detail_open_id: this.detailOpenId,
      visible_ms: Math.round(this.visibleMs),
      max_scroll_ratio: Math.round(this.maxScroll * 1000) / 1000,
      idle_capped: this.capped,
    };
  }

  private resume(nowMs: number): void {
    if (this.pageVisible && this.visibleMs < DWELL_CAP_MS) this.countingSince = nowMs;
  }

  private advance(nowMs: number): void {
    if (this.countingSince !== null) {
      const idleAt = this.lastActivity + DWELL_IDLE_MS;
      const end = Math.min(nowMs, idleAt);
      if (end > this.countingSince) this.visibleMs += end - this.countingSince;
      if (nowMs >= idleAt) {
        this.capped = true;
        this.countingSince = null;
      } else {
        this.countingSince = nowMs;
      }
    }
    if (this.visibleMs >= DWELL_CAP_MS) {
      this.visibleMs = DWELL_CAP_MS;
      this.capped = true;
      this.countingSince = null;
    }
  }
}
