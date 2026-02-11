import { DoorOpen, Gamepad2, PlusCircle, Users } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createMatch, joinMatch } from '../utils/api.js';
import { saveMatchSession } from '../utils/storage.js';
import { TIME_CONTROL_OPTIONS } from '../utils/timeControls.js';

const HomePage = () => {
  const navigate = useNavigate();

  const [createName, setCreateName] = useState('');
  const [createTimeControlKey, setCreateTimeControlKey] = useState('');
  const [createNameError, setCreateNameError] = useState('');
  const [createTimeControlError, setCreateTimeControlError] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinCodeError, setJoinCodeError] = useState('');
  const [joinNameError, setJoinNameError] = useState('');
  const [error, setError] = useState('');
  const [loadingAction, setLoadingAction] = useState('');

  const persistAndRoute = ({ matchCode, playerName, playerColor, isCreator }) => {
    saveMatchSession(matchCode, {
      playerName,
      playerColor,
      isCreator,
    });

    navigate(`/match/${matchCode}`, {
      state: {
        playerName,
        playerColor,
        isCreator,
      },
    });
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setError('');
    setCreateNameError('');
    setCreateTimeControlError('');

    let hasValidationError = false;

    if (!createName.trim()) {
      setCreateNameError('Name is required.');
      hasValidationError = true;
    }

    if (!createTimeControlKey) {
      setCreateTimeControlError('Time mode selection is required.');
      hasValidationError = true;
    }

    if (hasValidationError) {
      return;
    }

    try {
      setLoadingAction('create');
      const response = await createMatch(createName.trim(), createTimeControlKey);
      persistAndRoute(response);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingAction('');
    }
  };

  const handleJoin = async (event) => {
    event.preventDefault();
    setError('');
    setJoinCodeError('');
    setJoinNameError('');

    let hasValidationError = false;
    if (!joinCode.trim()) {
      setJoinCodeError('Match code is required.');
      hasValidationError = true;
    }

    if (!joinName.trim()) {
      setJoinNameError('Name is required.');
      hasValidationError = true;
    }

    if (hasValidationError) {
      return;
    }

    try {
      setLoadingAction('join');
      const response = await joinMatch(joinName.trim(), joinCode.trim().toUpperCase());
      persistAndRoute(response);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingAction('');
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
      <header className="mb-10 text-center">
        <img
          src="/logo.png"
          alt="Stalemate logo"
          className="mx-auto mb-3 h-14 w-14 rounded-xl border border-slate-700 bg-slate-900/80 p-1.5 shadow-lg shadow-slate-950/40"
        />
        <p className="mb-2 text-xs uppercase tracking-[0.3em] text-cyan-300">Play Online & Local</p>
        <h1 className="text-3xl font-semibold text-slate-100 sm:text-5xl">Stalemate</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm text-slate-400 sm:text-base">
          Zero-login competitive chess with instant private match codes and a server-authoritative game state.
        </p>
      </header>

      {error ? (
        <div className="mx-auto mb-6 w-full max-w-4xl rounded-xl border border-rose-400/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <section className="space-y-5">
        <article className="rounded-2xl border border-slate-700/75 bg-slate-900/70 p-5 shadow-xl shadow-slate-950/40">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-lg font-semibold text-slate-100">Local Practice</h2>
              <p className="mt-2 text-sm text-slate-400">
                Play both sides on one device with full legal move validation powered by chess.js.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/60 bg-cyan-500/20 px-5 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/35 md:w-auto"
              onClick={() => navigate('/local')}
            >
              <Gamepad2 className="h-4 w-4" />
              Open Practice Board
            </button>
          </div>
        </article>

        <div className="grid gap-5 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-700/75 bg-slate-900/70 p-5 shadow-xl shadow-slate-950/40">
          <h2 className="text-lg font-semibold text-slate-100">Create Match</h2>
          <p className="mt-2 text-sm text-slate-400">Enter your name first, generate a 6-character code, and share instantly.</p>

          <form className="mt-4 space-y-3" onSubmit={handleCreate}>
            <label className="block text-xs uppercase tracking-[0.2em] text-slate-400" htmlFor="create-name">
              Your Name
            </label>
            <input
              id="create-name"
              value={createName}
              onChange={(event) => {
                setCreateName(event.target.value);
                if (createNameError) {
                  setCreateNameError('');
                }
              }}
              placeholder="Player One"
              maxLength={24}
              className="w-full rounded-xl border border-slate-600 bg-slate-950/40 px-3 py-2.5 text-slate-100 outline-none transition focus:border-cyan-400"
            />
            <p className="min-h-5 text-xs text-rose-300">{createNameError}</p>

            <fieldset>
              <legend className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">Time Mode</legend>
              <div className="grid grid-cols-2 gap-2">
                {TIME_CONTROL_OPTIONS.map((option) => {
                  const isSelected = createTimeControlKey === option.key;

                  return (
                    <label
                      key={option.key}
                      className={`cursor-pointer rounded-xl border px-3 py-2.5 transition ${
                        isSelected
                          ? 'border-cyan-400/70 bg-cyan-500/15 text-cyan-100'
                          : 'border-slate-600 bg-slate-950/40 text-slate-200 hover:bg-slate-900/70'
                      }`}
                    >
                      <input
                        type="radio"
                        name="create-time-control"
                        value={option.key}
                        checked={isSelected}
                        onChange={(event) => {
                          setCreateTimeControlKey(event.target.value);
                          if (createTimeControlError) {
                            setCreateTimeControlError('');
                          }
                        }}
                        className="sr-only"
                      />
                      <p className="text-sm font-semibold">{option.label}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {Math.floor(option.initialTimeMs / 60000)} min + {Math.floor(option.incrementMs / 1000)} sec
                      </p>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <p className="min-h-5 text-xs text-rose-300">{createTimeControlError}</p>

            <button
              type="submit"
              disabled={loadingAction === 'create'}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-500 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PlusCircle className="h-4 w-4" />
              {loadingAction === 'create' ? 'Creating...' : 'Create Match'}
            </button>
          </form>
          </article>

          <article className="rounded-2xl border border-slate-700/75 bg-slate-900/70 p-5 shadow-xl shadow-slate-950/40">
          <h2 className="text-lg font-semibold text-slate-100">Join Match</h2>
          <p className="mt-2 text-sm text-slate-400">Enter room code, then confirm name before entering the board.</p>

          <form className="mt-4 space-y-3" onSubmit={handleJoin}>
            <label className="block text-xs uppercase tracking-[0.2em] text-slate-400" htmlFor="join-code">
              Match Code
            </label>
            <input
              id="join-code"
              value={joinCode}
              onChange={(event) => {
                setJoinCode(event.target.value.toUpperCase());
                if (joinCodeError) {
                  setJoinCodeError('');
                }
              }}
              placeholder="ABC123"
              maxLength={6}
              className="w-full rounded-xl border border-slate-600 bg-slate-950/40 px-3 py-2.5 font-mono tracking-[0.25em] text-slate-100 uppercase outline-none transition focus:border-cyan-400"
            />
            <p className="min-h-5 text-xs text-rose-300">{joinCodeError}</p>

            <label className="block text-xs uppercase tracking-[0.2em] text-slate-400" htmlFor="join-name">
              Your Name
            </label>
            <input
              id="join-name"
              value={joinName}
              onChange={(event) => {
                setJoinName(event.target.value);
                if (joinNameError) {
                  setJoinNameError('');
                }
              }}
              placeholder="Player Two"
              maxLength={24}
              className="w-full rounded-xl border border-slate-600 bg-slate-950/40 px-3 py-2.5 text-slate-100 outline-none transition focus:border-cyan-400"
            />
            <p className="min-h-5 text-xs text-rose-300">{joinNameError}</p>

            <button
              type="submit"
              disabled={loadingAction === 'join'}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/60 bg-emerald-500/15 px-4 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingAction === 'join' ? <DoorOpen className="h-4 w-4" /> : <Users className="h-4 w-4" />}
              {loadingAction === 'join' ? 'Joining...' : 'Join Match'}
            </button>
          </form>
          </article>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
