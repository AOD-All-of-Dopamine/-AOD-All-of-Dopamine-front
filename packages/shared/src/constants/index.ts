export * from "./domain";
export * from "./rec";
export * from "./platforms";
export * from "./steam";
export * from "./workSignal";
export * from "./collections";
// fieldLabels의 PLATFORM_LABELS는 platforms.ts와 이름 충돌 — 선택적 export
export {
  DOMAIN_FIELD_LABELS,
  PLATFORM_FIELD_LABELS,
  getFieldLabel,
  getPlatformLabel,
  formatFieldValue,
} from "./fieldLabels";
