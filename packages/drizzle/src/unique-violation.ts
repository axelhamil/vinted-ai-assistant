const UNIQUE_VIOLATION_CODE = "23505";

function findUniqueViolation(error: unknown): { constraint?: unknown } | null {
  if (typeof error !== "object" || error === null) return null;

  const candidate = error as {
    code?: unknown;
    constraint?: unknown;
    cause?: unknown;
  };
  if (candidate.code === UNIQUE_VIOLATION_CODE) return candidate;

  return findUniqueViolation(candidate.cause);
}

export function isUniqueViolation(
  error: unknown,
  constraints?: readonly string[],
): boolean {
  const violation = findUniqueViolation(error);
  if (violation === null) return false;
  if (!constraints) return true;

  return (
    typeof violation.constraint === "string" &&
    constraints.includes(violation.constraint)
  );
}
