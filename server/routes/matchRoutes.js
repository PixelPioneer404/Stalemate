import { Router } from 'express';
import { createMatch, joinMatch } from '../controllers/matchController.js';

const router = Router();

router.post('/create-match', createMatch);
router.post('/join-match', joinMatch);

export default router;
