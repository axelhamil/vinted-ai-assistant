export interface Prompt {
  system: string;
  prompt: string;
}

export function euros(cents: number): string {
  return `${(cents / 100).toFixed(2)} €`;
}
