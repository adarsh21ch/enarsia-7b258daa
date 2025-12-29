/**
 * Debounce utility for reducing API call frequency
 * Used to prevent rapid-fire updates during user interactions
 */

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Debounce that returns a promise - useful for async operations
 * Returns the result of the last call after debounce period
 */
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingResolve: ((value: any) => void) | null = null;
  let pendingReject: ((error: any) => void) | null = null;
  let lastArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    lastArgs = args;

    return new Promise((resolve, reject) => {
      // Store the latest resolve/reject for the final call
      pendingResolve = resolve;
      pendingReject = reject;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(async () => {
        timeoutId = null;
        try {
          const result = await fn(...(lastArgs as Parameters<T>));
          pendingResolve?.(result);
        } catch (error) {
          pendingReject?.(error);
        } finally {
          pendingResolve = null;
          pendingReject = null;
          lastArgs = null;
        }
      }, delay);
    });
  };
}

/**
 * Creates a debounced version of a function that batches multiple calls
 * Useful for collecting multiple rapid updates into a single operation
 */
export function batchDebounce<T>(
  fn: (items: T[]) => void | Promise<void>,
  delay: number
): (item: T) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let batch: T[] = [];

  return (item: T) => {
    batch.push(item);

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      const items = [...batch];
      batch = [];
      timeoutId = null;
      fn(items);
    }, delay);
  };
}
