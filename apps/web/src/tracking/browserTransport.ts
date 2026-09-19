import type { RecEventBatch, SendResult, TrackerTransport } from "@aod/shared/tracking";

export interface BrowserTransportOptions {
  baseURL: string;
  getToken: () => string | null;
}

export function createBrowserTransport({ baseURL, getToken }: BrowserTransportOptions): TrackerTransport {
  const url = `${baseURL.replace(/\/$/, "")}/api/rec-events`;
  // 운영(baseURL="/api")은 Vercel 프록시를 거친다 — 프록시는 JSON 객체 본문만 온전히 전달한다(같은 오리진이라 사전 요청도 없다).
  // 절대 URL(로컬 개발)은 다른 오리진의 백엔드 직접 호출 — 비콘이 사전 요청 없이 나가도록 text/plain. 백엔드는 둘 다 받는다.
  const contentType = baseURL.startsWith("/") ? "application/json" : "text/plain;charset=UTF-8";

  return {
    async send(batch: RecEventBatch, { unloading }): Promise<SendResult> {
      const body = JSON.stringify(batch);

      if (unloading) {
        // 페이지가 닫히는 중 — 응답을 기다릴 수 없고 헤더도 못 싣는다(user_id 는 서버가 session_id 로 잇는다)
        if (typeof navigator.sendBeacon === "function") {
          return navigator.sendBeacon(url, new Blob([body], { type: contentType })) ? "ok" : "drop";
        }
        void fetch(url, { method: "POST", body, keepalive: true, headers: { "Content-Type": contentType } }).catch(
          () => undefined,
        );
        return "ok";
      }

      const headers: Record<string, string> = { "Content-Type": contentType };
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
      try {
        const res = await fetch(url, { method: "POST", body, headers, keepalive: true });
        if (res.ok) return "ok";
        return res.status === 429 || res.status >= 500 ? "retry" : "drop";
      } catch {
        return "retry";
      }
    },
  };
}
