import express from 'express';
import { handleContactFormSubmission } from '../controller/contact.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/', protectRoute, handleContactFormSubmission);

export default router;
