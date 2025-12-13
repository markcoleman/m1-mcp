import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { envBool, envNumber } from "./utils.js";

describe("utils", () => {
  describe("envBool", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    it("returns false when environment variable is not set", () => {
      delete process.env.TEST_VAR;
      assert.equal(envBool("TEST_VAR"), false);
    });

    it("returns true when value is '1'", () => {
      process.env.TEST_VAR = "1";
      assert.equal(envBool("TEST_VAR"), true);
    });

    it("returns true when value is 'true' (lowercase)", () => {
      process.env.TEST_VAR = "true";
      assert.equal(envBool("TEST_VAR"), true);
    });

    it("returns true when value is 'TRUE' (uppercase)", () => {
      process.env.TEST_VAR = "TRUE";
      assert.equal(envBool("TEST_VAR"), true);
    });

    it("returns true when value is 'True' (mixed case)", () => {
      process.env.TEST_VAR = "True";
      assert.equal(envBool("TEST_VAR"), true);
    });

    it("returns false when value is '0'", () => {
      process.env.TEST_VAR = "0";
      assert.equal(envBool("TEST_VAR"), false);
    });

    it("returns false when value is 'false'", () => {
      process.env.TEST_VAR = "false";
      assert.equal(envBool("TEST_VAR"), false);
    });

    it("returns false when value is any other string", () => {
      process.env.TEST_VAR = "yes";
      assert.equal(envBool("TEST_VAR"), false);
    });
  });

  describe("envNumber", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    it("returns fallback when environment variable is not set", () => {
      delete process.env.TEST_NUM;
      assert.equal(envNumber("TEST_NUM", 42), 42);
    });

    it("returns parsed integer value", () => {
      process.env.TEST_NUM = "123";
      assert.equal(envNumber("TEST_NUM", 0), 123);
    });

    it("returns parsed float value", () => {
      process.env.TEST_NUM = "123.45";
      assert.equal(envNumber("TEST_NUM", 0), 123.45);
    });

    it("returns parsed negative value", () => {
      process.env.TEST_NUM = "-100";
      assert.equal(envNumber("TEST_NUM", 0), -100);
    });

    it("returns fallback when value is not a number", () => {
      process.env.TEST_NUM = "not-a-number";
      assert.equal(envNumber("TEST_NUM", 99), 99);
    });

    it("returns fallback when value is empty string", () => {
      process.env.TEST_NUM = "";
      assert.equal(envNumber("TEST_NUM", 50), 50);
    });

    it("returns fallback when value is Infinity", () => {
      process.env.TEST_NUM = "Infinity";
      assert.equal(envNumber("TEST_NUM", 10), 10);
    });

    it("returns fallback when value is NaN", () => {
      process.env.TEST_NUM = "NaN";
      assert.equal(envNumber("TEST_NUM", 20), 20);
    });
  });
});
