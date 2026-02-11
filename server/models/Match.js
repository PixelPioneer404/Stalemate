import mongoose from 'mongoose';
import { MATCH_STATUS } from '../utils/constants.js';

const { Schema } = mongoose;

const playerSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 24,
    },
    socketId: {
      type: String,
      default: null,
    },
    color: {
      type: String,
      enum: ['white', 'black'],
      required: true,
    },
    isCreator: {
      type: Boolean,
      default: false,
    },
    connected: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const resultSchema = new Schema(
  {
    outcome: {
      type: String,
      required: true,
    },
    winnerColor: {
      type: String,
      enum: ['white', 'black', null],
      default: null,
    },
    reason: {
      type: String,
      required: true,
    },
    actor: {
      type: String,
      default: null,
    },
  },
  { _id: false }
);

const lastMoveSchema = new Schema(
  {
    from: String,
    to: String,
    san: String,
    capture: Boolean,
    check: Boolean,
    promotion: String,
  },
  { _id: false }
);

const matchSchema = new Schema(
  {
    matchCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      minlength: 6,
      maxlength: 6,
      index: true,
    },
    players: {
      type: [playerSchema],
      default: [],
      validate: {
        validator: (value) => value.length <= 2,
        message: 'A match can contain at most two players.',
      },
    },
    fen: {
      type: String,
      required: true,
    },
    fenHistory: {
      type: [String],
      default: [],
    },
    moveHistory: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: Object.values(MATCH_STATUS),
      default: MATCH_STATUS.WAITING,
    },
    result: {
      type: resultSchema,
      default: null,
    },
    lastMove: {
      type: lastMoveSchema,
      default: null,
    },
    drawOfferedBy: {
      type: String,
      enum: ['white', 'black', null],
      default: null,
    },
    timeControlKey: {
      type: String,
      required: true,
      default: 'rapid_15_10',
    },
    timeControlLabel: {
      type: String,
      required: true,
      default: 'Rapid 15|10',
    },
    initialTimeMs: {
      type: Number,
      required: true,
      min: 1,
      default: 15 * 60 * 1000,
    },
    incrementMs: {
      type: Number,
      required: true,
      min: 0,
      default: 10 * 1000,
    },
    whiteTimeMs: {
      type: Number,
      required: true,
      min: 0,
      default: 15 * 60 * 1000,
    },
    blackTimeMs: {
      type: Number,
      required: true,
      min: 0,
      default: 15 * 60 * 1000,
    },
    activeTurnStartedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

matchSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Match = mongoose.model('Match', matchSchema);

export default Match;
