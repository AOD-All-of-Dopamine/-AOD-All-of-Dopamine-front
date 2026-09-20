import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createApiClients } from "../src/api/client";
import { createAuthApi } from "../src/api/authApi";

const BASE = "http://test.local";

let signupBody: unknown = null;
let signupResponse: Record<string, unknown> = {};

const server = setupServer(
  http.post(`${BASE}/api/auth/signup`, async ({ request }) => {
    signupBody = await request.json();
    return HttpResponse.json(signupResponse);
  }),
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  signupBody = null;
  signupResponse = {};
});
afterAll(() => server.close());

const makeAuthApi = () => {
  const { publicApi, privateApi } = createApiClients({ baseURL: BASE, getToken: () => null });
  return createAuthApi(publicApi, privateApi);
};

describe("createAuthApi.signup", () => {
  it("아이디·이메일·비밀번호만 보낸다", async () => {
    signupResponse = { message: "회원가입이 완료되었습니다.", username: "newUser", needsOnboarding: true };
    await makeAuthApi().signup({ username: "newUser", email: "a@b.co", password: "pw1234" });
    expect(signupBody).toEqual({ username: "newUser", email: "a@b.co", password: "pw1234" });
  });

  it("needsOnboarding 을 그대로 돌려준다 (6번 백엔드)", async () => {
    signupResponse = { message: "회원가입이 완료되었습니다.", username: "newUser", needsOnboarding: true };
    const result = await makeAuthApi().signup({ username: "newUser", email: "a@b.co", password: "pw1234" });
    expect(result.username).toBe("newUser");
    expect(result.needsOnboarding).toBe(true);
  });

  it("필드가 없는 옛 서버 응답에서도 깨지지 않는다 (추가 필드라 하위 호환)", async () => {
    signupResponse = { message: "회원가입이 완료되었습니다.", username: "newUser" };
    const result = await makeAuthApi().signup({ username: "newUser", email: "a@b.co", password: "pw1234" });
    expect(result.needsOnboarding).toBeUndefined();
  });
});
