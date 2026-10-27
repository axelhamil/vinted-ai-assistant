import { describe, expect, it, vi } from "vitest";
import { loadPage } from "./__fixtures__/load";
import { fillField, injectPhotos } from "./listing-form";

const nativeValue = (element: HTMLInputElement): string | undefined =>
  Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.get?.call(element);

const trackLikeReact = (element: HTMLInputElement) => {
  const instanceSetter = vi.fn();
  Object.defineProperty(element, "value", {
    configurable: true,
    get: () => nativeValue(element),
    set: instanceSetter,
  });

  return instanceSetter;
};

describe("fillField", () => {
  it("sets a controlled input through the native setter", () => {
    const doc = loadPage("newListing");
    const input = doc.querySelector<HTMLInputElement>('input[name="title"]');
    if (!input) throw new Error("fixture has no title input");
    const instanceSetter = trackLikeReact(input);
    const events: string[] = [];
    doc.addEventListener("input", (event) => events.push(event.type));
    doc.addEventListener("change", (event) => events.push(event.type));

    expect(fillField(doc, "title", "Veste en jean Levi's")).toBe(true);
    expect(nativeValue(input)).toBe("Veste en jean Levi's");
    expect(instanceSetter).not.toHaveBeenCalled();
    expect(events).toEqual(["input", "change"]);
  });

  it("fills the description and a numeric price", () => {
    const doc = loadPage("newListing");

    expect(fillField(doc, "description", "Très bon état")).toBe(true);
    expect(fillField(doc, "price", 12.5)).toBe(true);
    expect(doc.querySelector<HTMLTextAreaElement>("textarea")?.value).toBe(
      "Très bon état",
    );
    expect(
      doc.querySelector<HTMLInputElement>('input[name="price"]')?.value,
    ).toBe("12.5");
  });

  it("reports a missing field", () => {
    expect(fillField(loadPage("item"), "title", "Veste")).toBe(false);
  });
});

describe("injectPhotos", () => {
  const files = [
    new File(["a"], "a.jpg", { type: "image/jpeg" }),
    new File(["b"], "b.jpg", { type: "image/jpeg" }),
  ];

  it("puts the files into the upload input and notifies the form", () => {
    const doc = loadPage("newListing");
    const onChange = vi.fn();
    doc.body.addEventListener("change", onChange);

    expect(injectPhotos(doc, files)).toBe(true);
    expect(
      doc.querySelector<HTMLInputElement>('input[type="file"]')?.files,
    ).toHaveLength(2);
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("reports a page without an upload input", () => {
    expect(injectPhotos(loadPage("item"), files)).toBe(false);
  });
});
