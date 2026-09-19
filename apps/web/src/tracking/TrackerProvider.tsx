import type { ReactNode } from "react";
import type { RecTracker } from "@aod/shared/tracking";
import { TrackerContext } from "./trackerContext";

export function TrackerProvider({ tracker, children }: { tracker: RecTracker; children: ReactNode }) {
  return <TrackerContext.Provider value={tracker}>{children}</TrackerContext.Provider>;
}
