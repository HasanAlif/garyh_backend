import express from 'express';
import { landOwnerRoute, protectRoute } from '../middleware/auth.middleware.js';
import { createLand, getAllLand, deleteLand } from '../controller/land.controller.js';

const router = express.Router();

router.get('/lands', protectRoute, landOwnerRoute, getAllLand);
router.post('/addland', protectRoute, landOwnerRoute, createLand);
router.delete('/deleteland/:id', protectRoute, landOwnerRoute, deleteLand);

export default router;