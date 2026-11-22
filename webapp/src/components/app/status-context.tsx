"use client";

import { createContext, useContext } from "react";
import type { MyStatus } from "@/lib/types";

export type StatusContextValue = { userId: string; status: MyStatus; refresh: () => Promise<void> };
export const StatusContext = createContext<StatusContextValue | null>(null);

export function useMe() {
  const v = useContext(StatusContext);
  if (!v) throw new Error("useMe must be used inside AppShell");
  return v;
}
