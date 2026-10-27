const AMOUNT = /\d[\d\s.,]*/;

const SPACES = /\s/g;

const SEPARATORS = /[.,]/g;

const TRAILING_SEPARATOR = /[.,]$/;

const THOUSANDS_GROUP_LENGTH = 3;

const decimalIndex = (digits: string): number => {
  const last = Math.max(digits.lastIndexOf(","), digits.lastIndexOf("."));

  if (last === -1) return digits.length;

  const separator = digits.charAt(last);
  const hasBothSeparators = digits.includes(",") && digits.includes(".");

  if (hasBothSeparators) return last;

  const isRepeated = digits.indexOf(separator) !== last;
  const isThousandsGroup = digits.length - last - 1 === THOUSANDS_GROUP_LENGTH;

  return isRepeated || isThousandsGroup ? digits.length : last;
};

export const parsePrice = (text: string): number | null => {
  const digits = text
    .match(AMOUNT)?.[0]
    .replace(SPACES, "")
    .replace(TRAILING_SEPARATOR, "");

  if (!digits) return null;

  const index = decimalIndex(digits);
  const whole = digits.slice(0, index).replace(SEPARATORS, "");
  const fraction = digits.slice(index + 1) || "0";
  const amount = Number(`${whole}.${fraction}`);

  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : null;
};
