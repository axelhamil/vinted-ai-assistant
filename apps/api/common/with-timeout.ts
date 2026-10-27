export function withTimeout<T>(
  work: Promise<T>,
  timeoutMs: number,
  onTimeout: T,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(onTimeout), timeoutMs);
  });

  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}
