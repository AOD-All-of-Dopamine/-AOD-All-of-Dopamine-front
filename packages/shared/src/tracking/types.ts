/** 클라이언트가 POST /api/rec-events 로 보낼 수 있는 타입 — 백엔드 RecEventTypes.CLIENT_TYPES 와 같아야 한다. */
export const REC_CLIENT_EVENT_TYPES = [
  "impression_viewed",
  "card_clicked",
  "detail_viewed",
  "outbound_clicked",
  "rec_loaded_more",
  "rec_tab_changed",
] as const;

export type RecEventType = (typeof REC_CLIENT_EVENT_TYPES)[number];

/** track() 에 넘기는 값. 전부 선택. */
export interface RecEventFields {
  contentId?: number;
  requestId?: string;
  impressionId?: string;
  surface?: string;
  payload?: Record<string, unknown>;
}

/** 전송되는 이벤트 1건 (REC_TAB_DESIGN §4-1). */
export interface RecEvent extends RecEventFields {
  eventId: string;
  type: RecEventType;
  /** ISO-8601 UTC */
  clientTs: string;
}

export interface RecEventBatch {
  anonId: string;
  sessionId: string;
  appVersion?: string;
  device?: "mobile" | "desktop";
  events: RecEvent[];
}

/** ok = 받았다 · retry = 잠시 뒤 다시 · drop = 다시 보내도 소용없다(4xx 등) */
export type SendResult = "ok" | "retry" | "drop";

export interface TrackerTransport {
  /** unloading=true 면 페이지가 닫히는 중이다 — 응답을 기다릴 수 없다(웹은 sendBeacon). */
  send(batch: RecEventBatch, opts: { unloading: boolean }): Promise<SendResult> | SendResult;
}

export interface TrackerIds {
  anonId(): string;
  sessionId(): string;
}

/** 서버 이벤트(reaction_changed 등)를 노출에 잇기 위해 API 호출에 붙이는 맥락. */
export interface RecRequestContext {
  source?: string;
  requestId?: string;
  impressionId?: string;
}
