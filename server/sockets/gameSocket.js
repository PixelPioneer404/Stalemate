import { Chess } from 'chess.js';
import Match from '../models/Match.js';
import { getMatchSnapshot } from '../utils/chessState.js';
import { MATCH_STATUS } from '../utils/constants.js';
import { withMatchLock } from '../utils/lockManager.js';
import {
  MatchServiceError,
  applyMoveToMatch,
  attachSocketToMatch,
  detachSocketFromMatches,
  getPlayerBySocket,
  markAborted,
  markDrawByAgreement,
  markResigned,
  normalizeMatchCode,
  resolveTurnTimeout,
} from '../utils/matchService.js';

const emitErrorAck = (ack, message, code = 'BAD_REQUEST') => {
  if (typeof ack === 'function') {
    ack({ ok: false, error: message, code });
  }
};

const emitOkAck = (ack, payload = {}) => {
  if (typeof ack === 'function') {
    ack({ ok: true, ...payload });
  }
};

const emitBoardState = (io, match, chess = null) => {
  io.to(match.matchCode).emit('updateBoard', getMatchSnapshot(match, chess ?? new Chess(match.fen)));
};

const emitGameOver = (io, match) => {
  io.to(match.matchCode).emit('gameOver', {
    matchCode: match.matchCode,
    status: match.status,
    result: match.result,
  });
};

const handleActionError = (ack, error) => {
  if (error instanceof MatchServiceError) {
    emitErrorAck(ack, error.message, 'MATCH_SERVICE_ERROR');
    return;
  }

  emitErrorAck(ack, 'Unexpected server error.', 'SERVER_ERROR');
};

const ensureActiveMatch = (match) => {
  if (match.status !== MATCH_STATUS.ACTIVE) {
    throw new MatchServiceError('Match is not active.', 400);
  }

  if (match.players.length < 2) {
    throw new MatchServiceError('Waiting for opponent to join.', 409);
  }
};

const getRequester = (match, socketId) => {
  const player = getPlayerBySocket(match, socketId);

  if (!player) {
    throw new MatchServiceError('Socket is not registered in this match.', 403);
  }

  return player;
};

const joinRoom = async (io, socket, payload, ack, { allowAutoJoinSecond }) => {
  try {
    const { matchCode, name } = payload;
    const { match, player } = await attachSocketToMatch({
      rawCode: matchCode,
      rawName: name,
      socketId: socket.id,
      allowAutoJoinSecond,
    });

    socket.join(match.matchCode);
    socket.data.matchCode = match.matchCode;
    socket.data.playerName = player.name;
    socket.data.playerColor = player.color;
    socket.data.isCreator = player.isCreator;
    emitBoardState(io, match);

    emitOkAck(ack, {
      matchCode: match.matchCode,
      playerColor: player.color,
      state: getMatchSnapshot(match),
    });
  } catch (error) {
    handleActionError(ack, error);
  }
};

const handleMove = async (io, socket, payload, ack) => {
  const { matchCode: rawCode, from, to, promotion = 'q' } = payload;

  let matchCode;

  try {
    matchCode = normalizeMatchCode(rawCode);
  } catch (error) {
    handleActionError(ack, error);
    return;
  }

  try {
    await withMatchLock(matchCode, async () => {
      const match = await Match.findOne({ matchCode });

      if (!match) {
        throw new MatchServiceError('Match not found.', 404);
      }

      ensureActiveMatch(match);

      const chess = new Chess(match.fen);
      const timedOutColor = resolveTurnTimeout(match, chess, Date.now());

      if (timedOutColor) {
        await match.save();
        emitBoardState(io, match, chess);
        emitGameOver(io, match);
        emitErrorAck(ack, 'Time has expired for this game.', 'TIMEOUT');
        return;
      }

      const player = getRequester(match, socket.id);

      const expectedTurn = chess.turn() === 'w' ? 'white' : 'black';
      if (player.color !== expectedTurn) {
        throw new MatchServiceError('Not your turn.', 409);
      }

      const move = chess.move({ from, to, promotion });
      if (!move) {
        throw new MatchServiceError('Illegal move.', 422);
      }

      applyMoveToMatch(match, chess, move, player);

      if (match.status === MATCH_STATUS.ACTIVE) {
        const clockField = player.color === 'white' ? 'whiteTimeMs' : 'blackTimeMs';
        match[clockField] = Math.max(0, Number(match[clockField] ?? 0) + Number(match.incrementMs ?? 0));
        match.activeTurnStartedAt = new Date();
      }

      await match.save();

      emitBoardState(io, match, chess);

      if (match.status === MATCH_STATUS.FINISHED) {
        emitGameOver(io, match);
      }

      emitOkAck(ack);
    });
  } catch (error) {
    handleActionError(ack, error);
  }
};

const handleResign = async (io, socket, payload, ack) => {
  const { matchCode: rawCode } = payload;

  let matchCode;

  try {
    matchCode = normalizeMatchCode(rawCode);
  } catch (error) {
    handleActionError(ack, error);
    return;
  }

  try {
    await withMatchLock(matchCode, async () => {
      const match = await Match.findOne({ matchCode });
      if (!match) {
        throw new MatchServiceError('Match not found.', 404);
      }

      ensureActiveMatch(match);

      const player = getRequester(match, socket.id);
      markResigned(match, player);
      await match.save();

      emitBoardState(io, match);
      emitGameOver(io, match);
      emitOkAck(ack);
    });
  } catch (error) {
    handleActionError(ack, error);
  }
};

const handleAbort = async (io, socket, payload, ack) => {
  const { matchCode: rawCode } = payload;

  let matchCode;

  try {
    matchCode = normalizeMatchCode(rawCode);
  } catch (error) {
    handleActionError(ack, error);
    return;
  }

  try {
    await withMatchLock(matchCode, async () => {
      const match = await Match.findOne({ matchCode });
      if (!match) {
        throw new MatchServiceError('Match not found.', 404);
      }

      ensureActiveMatch(match);

      const player = getRequester(match, socket.id);
      markAborted(match, player);
      await match.save();

      io.to(match.matchCode).emit('abort', {
        matchCode: match.matchCode,
        by: player.name,
      });

      emitBoardState(io, match);
      emitGameOver(io, match);
      emitOkAck(ack);
    });
  } catch (error) {
    handleActionError(ack, error);
  }
};

const handleDrawRequest = async (io, socket, payload, ack) => {
  const { matchCode: rawCode } = payload;

  let matchCode;

  try {
    matchCode = normalizeMatchCode(rawCode);
  } catch (error) {
    handleActionError(ack, error);
    return;
  }

  try {
    await withMatchLock(matchCode, async () => {
      const match = await Match.findOne({ matchCode });
      if (!match) {
        throw new MatchServiceError('Match not found.', 404);
      }

      ensureActiveMatch(match);

      const player = getRequester(match, socket.id);

      if (match.drawOfferedBy === player.color) {
        throw new MatchServiceError('You have already requested a draw.', 409);
      }

      match.drawOfferedBy = player.color;
      await match.save();

      socket.to(match.matchCode).emit('drawRequest', {
        matchCode: match.matchCode,
        from: player.name,
        color: player.color,
      });

      emitBoardState(io, match);
      emitOkAck(ack);
    });
  } catch (error) {
    handleActionError(ack, error);
  }
};

const handleDrawAccepted = async (io, socket, payload, ack) => {
  const { matchCode: rawCode, accepted } = payload;

  let matchCode;

  try {
    matchCode = normalizeMatchCode(rawCode);
  } catch (error) {
    handleActionError(ack, error);
    return;
  }

  try {
    await withMatchLock(matchCode, async () => {
      const match = await Match.findOne({ matchCode });
      if (!match) {
        throw new MatchServiceError('Match not found.', 404);
      }

      ensureActiveMatch(match);

      const player = getRequester(match, socket.id);

      if (!match.drawOfferedBy) {
        throw new MatchServiceError('No active draw request.', 409);
      }

      if (match.drawOfferedBy === player.color) {
        throw new MatchServiceError('You cannot accept your own draw request.', 409);
      }

      if (!accepted) {
        match.drawOfferedBy = null;
        await match.save();

        io.to(match.matchCode).emit('drawAccepted', {
          matchCode: match.matchCode,
          accepted: false,
          by: player.name,
        });

        emitBoardState(io, match);
        emitOkAck(ack);
        return;
      }

      markDrawByAgreement(match, player);
      await match.save();

      io.to(match.matchCode).emit('drawAccepted', {
        matchCode: match.matchCode,
        accepted: true,
        by: player.name,
      });

      emitBoardState(io, match);
      emitGameOver(io, match);
      emitOkAck(ack);
    });
  } catch (error) {
    handleActionError(ack, error);
  }
};

const handleCancelRoom = async (io, socket, payload, ack) => {
  const { matchCode: rawCode } = payload;

  let matchCode;

  try {
    matchCode = normalizeMatchCode(rawCode);
  } catch (error) {
    handleActionError(ack, error);
    return;
  }

  try {
    await withMatchLock(matchCode, async () => {
      const match = await Match.findOne({ matchCode });
      if (!match) {
        throw new MatchServiceError('Match not found.', 404);
      }

      const player = getRequester(match, socket.id);

      if (!player.isCreator) {
        throw new MatchServiceError('Only the room creator can cancel the match.', 403);
      }

      await Match.deleteOne({ _id: match._id });

      io.to(match.matchCode).emit('cancelRoom', {
        matchCode: match.matchCode,
        canceledBy: player.name,
      });

      const socketsInRoom = await io.in(match.matchCode).fetchSockets();
      await Promise.all(socketsInRoom.map((roomSocket) => roomSocket.leave(match.matchCode)));

      emitOkAck(ack);
    });
  } catch (error) {
    handleActionError(ack, error);
  }
};

export const registerGameSocketHandlers = (io, socket) => {
  socket.on('createRoom', (payload, ack) => joinRoom(io, socket, payload, ack, { allowAutoJoinSecond: false }));

  socket.on('joinRoom', (payload, ack) => joinRoom(io, socket, payload, ack, { allowAutoJoinSecond: true }));

  socket.on('move', (payload, ack) => handleMove(io, socket, payload, ack));
  socket.on('resign', (payload, ack) => handleResign(io, socket, payload, ack));
  socket.on('abort', (payload, ack) => handleAbort(io, socket, payload, ack));
  socket.on('drawRequest', (payload, ack) => handleDrawRequest(io, socket, payload, ack));
  socket.on('drawAccepted', (payload, ack) => handleDrawAccepted(io, socket, payload, ack));
  socket.on('cancelRoom', (payload, ack) => handleCancelRoom(io, socket, payload, ack));

  socket.on('disconnect', async () => {
    const updates = await detachSocketFromMatches(socket.id);

    updates.forEach((update) => {
      if (update.status === MATCH_STATUS.ACTIVE) {
        socket.to(update.matchCode).emit('opponentDisconnected', {
          matchCode: update.matchCode,
          playerName: update.playerName,
        });
      }
    });
  });
};
