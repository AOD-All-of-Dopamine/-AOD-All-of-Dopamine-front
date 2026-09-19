import { createContext, useContext } from "react";
import type { RecTracker } from "@aod/shared/tracking";

/** Provider 밖(스토리·개별 렌더)에서는 아무 일도 하지 않는다 — 추적 때문에 화면이 깨지면 안 된다. */
export const NOOP_TRACKER: RecTracker = {
  track: () => undefined,
  flush: async () => undefined,
  addFinalizer: () => () => undefined,
  pending: () => 0,
  dispose: () => undefined,
};

export const TrackerContext = createContext<RecTracker>(NOOP_TRACKER);

export function useTracker(): RecTracker {
  return useContext(TrackerContext);
}
