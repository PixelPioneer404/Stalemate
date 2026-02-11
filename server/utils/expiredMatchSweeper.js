import { Chess } from 'chess.js';
import Match from '../models/Match.js';
import { MATCH_STATUS } from './constants.js';
import { withMatchLock } from './lockManager.js';
import { resolveTurnTimeout, syncTimeControlFields } from './matchService.js';
import { getMatchSnapshot } from './chessState.js';

const ROOM_SWEEP_INTERVAL_MS = 15_000;
const CLOCK_SWEEP_INTERVAL_MS = 1_000;

const sweepWaitingRooms = async (io) => {
  const expiredMatches = await Match.find({
    status: MATCH_STATUS.WAITING,
    expiresAt: { $lte: new Date() },
  })
    .select('_id matchCode status expiresAt')
    .lean();

  for (const candidate of expiredMatches) {
    await withMatchLock(candidate.matchCode, async () => {
      const match = await Match.findById(candidate._id);

      if (!match || match.status !== MATCH_STATUS.WAITING || match.expiresAt > new Date()) {
        return;
      }

      await Match.deleteOne({ _id: match._id });

      io.to(match.matchCode).emit('cancelRoom', {
        matchCode: match.matchCode,
        canceledBy: 'system',
        reason: 'Room expired before a second player joined.',
      });

      const socketsInRoom = await io.in(match.matchCode).fetchSockets();
      await Promise.all(socketsInRoom.map((socket) => socket.leave(match.matchCode)));
    });
  }
};

const sweepFlaggedGames = async (io) => {
  const activeMatches = await Match.find({
    status: MATCH_STATUS.ACTIVE,
    activeTurnStartedAt: { $ne: null },
  })
    .select('_id matchCode')
    .lean();

  for (const candidate of activeMatches) {
    await withMatchLock(candidate.matchCode, async () => {
      const match = await Match.findById(candidate._id);

      if (!match || match.status !== MATCH_STATUS.ACTIVE) {
        return;
      }

      syncTimeControlFields(match);

      const chess = new Chess(match.fen);
      const timeoutColor = resolveTurnTimeout(match, chess, Date.now());

      if (!timeoutColor) {
        return;
      }

      await match.save();

      io.to(match.matchCode).emit('updateBoard', getMatchSnapshot(match, chess));
      io.to(match.matchCode).emit('gameOver', {
        matchCode: match.matchCode,
        status: match.status,
        result: match.result,
      });
    });
  }
};

export const startExpiredMatchSweeper = (io) => {
  const roomSweepTimer = setInterval(async () => {
    try {
      await sweepWaitingRooms(io);
    } catch (error) {
      console.error('Expired waiting-room sweep failed:', error);
    }
  }, ROOM_SWEEP_INTERVAL_MS);

  const clockSweepTimer = setInterval(async () => {
    try {
      await sweepFlaggedGames(io);
    } catch (error) {
      console.error('Clock timeout sweep failed:', error);
    }
  }, CLOCK_SWEEP_INTERVAL_MS);

  roomSweepTimer.unref?.();
  clockSweepTimer.unref?.();

  return () => {
    clearInterval(roomSweepTimer);
    clearInterval(clockSweepTimer);
  };
};
