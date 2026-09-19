import { createRecTracker, type RecTracker, type TrackerIds } from "@aod/shared/tracking";
import { newUuid } from "./browserIds";
import { createBrowserTransport } from "./browserTransport";

export interface WebTrackerOptions {
  baseURL: string;
  ids: TrackerIds;
  getToken: () => string | null;
  isDev: boolean;
  appVersion?: string;
}

/** 앱 진입점에서 한 번 만든다. 페이지를 떠날 때(hidden·pagehide) 남은 이벤트를 비콘으로 보낸다. */
export function createWebTracker({ baseURL, ids, getToken, isDev, appVersion = "web" }: WebTrackerOptions): RecTracker {
  const tracker = createRecTracker({
    ids,
    transport: createBrowserTransport({ baseURL, getToken }),
    uuid: newUuid,
    appVersion,
    device: window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop",
    onDebug: isDev ? (message, data) => console.debug("[rec-tracker]", message, data) : undefined,
  });

  const flushOnLeave = () => {
    void tracker.flush({ unloading: true });
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushOnLeave();
  });
  window.addEventListener("pagehide", flushOnLeave);

  return tracker;
}
