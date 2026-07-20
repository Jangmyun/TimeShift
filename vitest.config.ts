import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// 컴포넌트 테스트 환경. jsdom + React Testing Library로 krds-react/커스텀 컴포넌트를 렌더한다.
// `@/*` alias는 tsconfig paths와 맞춰 두고, CSS import는 처리하지 않는다(컴포넌트 로직만 검증).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
  },
});
