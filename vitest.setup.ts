// jest-dom 매처(toBeInTheDocument 등)를 Vitest expect에 등록 + 타입 augmentation.
// 이 파일이 tsconfig include(**/*.ts)에 잡히므로 augmentation이 전 테스트에 전역 적용된다.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// 각 테스트 후 렌더된 DOM을 정리해 테스트 간 누수를 막는다.
afterEach(() => {
  cleanup();
});
