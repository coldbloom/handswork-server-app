import { Router } from "express";

import authRouter from "./authRouter"
import { externalApiSearchController } from '../controllers/externalApiSearchController';
import { testController } from '../controllers/testController';

const router = Router();

router.use('/auth', authRouter);
router.get('/api/search', externalApiSearchController);
router.get('/api/test', testController);

export default router;

