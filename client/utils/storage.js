const PREFIX = 'chess-match-session:';

export const saveMatchSession = (matchCode, value) => {
  localStorage.setItem(`${PREFIX}${matchCode}`, JSON.stringify(value));
};

export const loadMatchSession = (matchCode) => {
  const raw = localStorage.getItem(`${PREFIX}${matchCode}`);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const clearMatchSession = (matchCode) => {
  localStorage.removeItem(`${PREFIX}${matchCode}`);
};
