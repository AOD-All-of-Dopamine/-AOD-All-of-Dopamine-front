import tseslint from "typescript-eslint";

export default tseslint.config({
  files: ["src/**/*.{ts,tsx}"],
  extends: [...tseslint.configs.recommended],
  rules: {
    "no-restricted-globals": [
      "error",
      { name: "window", message: "플랫폼 의존 금지 — 앱에서 주입하세요." },
      { name: "document", message: "플랫폼 의존 금지 — 앱에서 주입하세요." },
      { name: "localStorage", message: "플랫폼 의존 금지 — getToken으로 주입하세요." },
      { name: "process", message: "환경값은 앱에서 읽어 주입하세요." },
    ],
    "no-restricted-syntax": [
      "error",
      {
        selector:
          "MemberExpression[property.name='env'] > MetaProperty[meta.name='import'][property.name='meta']",
        message: "import.meta.env는 앱에서 읽고 shared에 주입하세요.",
      },
    ],
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["react-native", "react-native/*", "expo-*", "@react-native-*"],
            message: "shared는 네이티브 플랫폼에 의존할 수 없습니다.",
          },
        ],
      },
    ],
  },
});
