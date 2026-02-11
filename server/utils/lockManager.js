const queues = new Map();

export const withMatchLock = async (lockKey, task) => {
  const previous = queues.get(lockKey) ?? Promise.resolve();

  let releaseCurrent;
  const current = new Promise((resolve) => {
    releaseCurrent = resolve;
  });

  queues.set(lockKey, previous.then(() => current));
  await previous;

  try {
    return await task();
  } finally {
    releaseCurrent();

    if (queues.get(lockKey) === current) {
      queues.delete(lockKey);
    }
  }
};
