const WHOLE = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

const CENTS = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const euros = (amount: number): string =>
  `${(Number.isInteger(amount) ? WHOLE : CENTS).format(amount)} €`;

export const signedEuros = (amount: number): string =>
  `${amount > 0 ? "+" : amount < 0 ? "−" : ""}${euros(Math.abs(amount))}`;

const PERCENT = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export const percent = (value: number): string => `${PERCENT.format(value)} %`;
