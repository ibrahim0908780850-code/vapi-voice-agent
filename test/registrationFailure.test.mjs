import assert from "node:assert/strict";
import test from "node:test";
import { registrationFailure } from "../server/lib/registrationFailure.js";

test("maps a duplicate registration to a sign-in guidance response", () => {
  assert.deepEqual(registrationFailure({ code: "23505", message: "duplicate key" }), {
    status: 409,
    error: "account_already_exists",
    message: "يوجد حساب أو طلب شركة مسجل بهذا البريد الإلكتروني. سجّل الدخول للمتابعة."
  });
});

test("maps database permission failures to a configuration response", () => {
  assert.equal(registrationFailure({ code: "42501", message: "row-level security denied" }).error, "registration_configuration_error");
});

test("maps unknown failures to a safe generic response", () => {
  assert.equal(registrationFailure(new Error("connection reset")).status, 500);
});
