import React, { createContext, useContext } from "react";
import type { Apis } from "../api/createApis";

const ApiContext = createContext<Apis | undefined>(undefined);

export const ApiProvider: React.FC<{ apis: Apis; children: React.ReactNode }> = ({
  apis,
  children,
}) => <ApiContext.Provider value={apis}>{children}</ApiContext.Provider>;

export function useApis(): Apis {
  const apis = useContext(ApiContext);
  if (apis === undefined) {
    throw new Error("useApis must be used within an ApiProvider");
  }
  return apis;
}
