type ListingField = "title" | "description" | "price";

const FIELDS: Record<ListingField, readonly string[]> = {
  title: ['input[name="title"]', '[data-testid="title-input"]', "#title"],
  description: [
    'textarea[name="description"]',
    '[data-testid="description-input"]',
    "#description",
  ],
  price: [
    'input[name="price"]',
    '[data-testid="price-input"]',
    "#price",
    'input[type="number"][name*="price"]',
  ],
};

const IMAGE_INPUT = 'input[type="file"][accept*="image"]';

const UPLOAD_ZONES = [
  '[data-testid="photo-upload"]',
  '[data-testid="photo-dropzone"]',
  ".photo-upload",
  ".photo-upload__dropzone",
  '[class*="dropzone"]',
  '[class*="photo-upload"]',
  '[class*="PhotoUpload"]',
];

type TextControl = HTMLInputElement | HTMLTextAreaElement;

const isTextControl = (element: Element | null): element is TextControl =>
  element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;

const findControl = (doc: Document, field: ListingField): TextControl | null =>
  FIELDS[field]
    .map((selector) => doc.querySelector(selector))
    .find(isTextControl) ?? null;

const nativeValueSetter = (control: TextControl) => {
  const prototype =
    control instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;

  return Object.getOwnPropertyDescriptor(prototype, "value")?.set;
};

const notify = (element: Element, types: string[]): void => {
  for (const type of types) {
    element.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
  }
};

export const fillField = (
  doc: Document,
  field: ListingField,
  value: string | number,
): boolean => {
  const control = findControl(doc, field);
  const setValue = control ? nativeValueSetter(control) : undefined;

  if (!control || !setValue) return false;

  control.focus();
  setValue.call(control, String(value));
  notify(control, ["input", "change"]);

  return true;
};

const FILE_INPUT = 'input[type="file"]';

const asInput = (
  element: Element | null | undefined,
): HTMLInputElement | null =>
  element instanceof HTMLInputElement ? element : null;

const findFileInput = (doc: Document): HTMLInputElement | null =>
  asInput(doc.querySelector(IMAGE_INPUT)) ??
  UPLOAD_ZONES.map((selector) =>
    asInput(doc.querySelector(selector)?.querySelector(FILE_INPUT)),
  ).find((input) => input !== null) ??
  null;

export const injectPhotos = (doc: Document, files: File[]): boolean => {
  const input = findFileInput(doc);

  if (!input) return false;

  const transfer = new DataTransfer();

  for (const file of [...(input.files ?? []), ...files]) {
    transfer.items.add(file);
  }

  input.files = transfer.files;
  notify(input, ["input", "change"]);

  return true;
};
