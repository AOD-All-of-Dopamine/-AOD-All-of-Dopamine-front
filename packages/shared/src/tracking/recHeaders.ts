import type { RecRequestContext } from "./types";

/** 백엔드 RecContextFilter 가 읽는 헤더 이름. */
export const REC_HEADER = {
  source: "X-Rec-Source",
  requestId: "X-Rec-Request-Id",
  impressionId: "X-Rec-Impression-Id",
  anonId: "X-Anon-Id",
  sessionId: "X-Session-Id",
} as const;

/** 값이 있는 항목만 헤더로 만든다. */
export function recHeaders(ctx?: RecRequestContext): Record<string, string> {
  const headers: Record<string, string> = {};
  if (ctx?.source) headers[REC_HEADER.source] = ctx.source;
  if (ctx?.requestId) headers[REC_HEADER.requestId] = ctx.requestId;
  if (ctx?.impressionId) headers[REC_HEADER.impressionId] = ctx.impressionId;
  return headers;
}
