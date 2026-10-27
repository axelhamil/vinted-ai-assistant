export const textOf = (element: Element | null | undefined): string | null => {
  const text = element?.textContent?.trim();

  return text ? text : null;
};

export const firstText = (
  root: ParentNode,
  selectors: readonly string[],
): string | null => {
  for (const selector of selectors) {
    const text = textOf(root.querySelector(selector));

    if (text) return text;
  }

  return null;
};

export const firstMatch = <T>(
  root: ParentNode,
  selectors: readonly string[],
  read: (element: Element) => T | null,
): T | null => {
  for (const selector of selectors) {
    for (const element of root.querySelectorAll(selector)) {
      const value = read(element);

      if (value !== null) return value;
    }
  }

  return null;
};
