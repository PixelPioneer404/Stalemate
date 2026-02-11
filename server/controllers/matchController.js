import { Chess } from 'chess.js';
import { getMatchSnapshot } from '../utils/chessState.js';
import {
  MatchServiceError,
  createMatchRecord,
  joinMatchRecord,
} from '../utils/matchService.js';

const sendError = (response, error) => {
  if (error instanceof MatchServiceError) {
    response.status(error.statusCode).json({ message: error.message });
    return;
  }

  response.status(500).json({ message: 'Unexpected server error.' });
};

export const createMatch = async (request, response) => {
  try {
    const { name, timeControlKey } = request.body;
    const { match, playerName, playerColor } = await createMatchRecord(name, timeControlKey);

    const snapshot = getMatchSnapshot(match, new Chess(match.fen));

    response.status(201).json({
      matchCode: match.matchCode,
      playerName,
      playerColor,
      isCreator: true,
      state: snapshot,
    });
  } catch (error) {
    sendError(response, error);
  }
};

export const joinMatch = async (request, response) => {
  try {
    const { name, matchCode } = request.body;
    const { match, playerName, playerColor } = await joinMatchRecord(matchCode, name);

    const snapshot = getMatchSnapshot(match, new Chess(match.fen));

    response.status(200).json({
      matchCode: match.matchCode,
      playerName,
      playerColor,
      isCreator: false,
      state: snapshot,
    });
  } catch (error) {
    sendError(response, error);
  }
};
