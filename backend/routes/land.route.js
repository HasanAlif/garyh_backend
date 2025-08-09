import express from 'express';
import { landOwnerRoute, protectRoute } from '../middleware/auth.middleware.js';
import { createLand } from '../controller/land.controller.js';

const router = express.Router();

router.post('/addland', protectRoute, landOwnerRoute, createLand);

export default router;