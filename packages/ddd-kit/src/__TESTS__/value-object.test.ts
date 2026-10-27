import { describe, expect, it } from "bun:test";
import { Result, ValueObject } from "../index";

class Email extends ValueObject<string> {
  protected validate(value: string): Result<string> {
    if (!value.includes("@")) return Result.fail("Invalid email format");

    return Result.ok(value.toLowerCase());
  }
}

interface FramingValue {
  layout: string;
  crop: { x: number; y: number };
  tags: string[];
}

class Framing extends ValueObject<FramingValue> {
  protected validate(value: FramingValue): Result<FramingValue> {
    return Result.ok(value);
  }
}

describe("ValueObject", () => {
  it("refuses a value its validation rejects, with the validation error, and holds the value the validation returns, not the raw input", () => {
    const refused = Email.create("not-an-email");
    const accepted = Email.create("OWNER@Example.COM");

    expect(refused.isFailure).toBe(true);
    expect(refused.getError()).toBe("Invalid email format");
    expect(accepted.getValue()).toBeInstanceOf(Email);
    expect(accepted.getValue().value).toBe("owner@example.com");
  });

  it("is equal by value, whatever the order of the keys at any depth", () => {
    const left = Framing.create({
      layout: "split",
      crop: { x: 1, y: 2 },
      tags: ["a", "b"],
    });
    const right = Framing.create({
      tags: ["a", "b"],
      crop: { y: 2, x: 1 },
      layout: "split",
    });

    expect(left.getValue().equals(right.getValue())).toBe(true);
  });

  it("is different when a field or the order of a list differs", () => {
    const framing = Framing.create({
      layout: "split",
      crop: { x: 1, y: 2 },
      tags: ["a", "b"],
    });
    const otherCrop = Framing.create({
      layout: "split",
      crop: { x: 1, y: 3 },
      tags: ["a", "b"],
    });
    const otherOrder = Framing.create({
      layout: "split",
      crop: { x: 1, y: 2 },
      tags: ["b", "a"],
    });

    expect(framing.getValue().equals(otherCrop.getValue())).toBe(false);
    expect(framing.getValue().equals(otherOrder.getValue())).toBe(false);
  });
});
