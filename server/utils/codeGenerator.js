import { customAlphabet } from 'nanoid';
import { MATCH_CODE_LENGTH } from './constants.js';

const codeAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const createCode = customAlphabet(codeAlphabet, MATCH_CODE_LENGTH);

export const generateMatchCode = () => createCode();
