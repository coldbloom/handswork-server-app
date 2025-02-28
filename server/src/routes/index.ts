import { Router } from "express";

import authRouter from "./authRouter"
import userInfoRouter from "./userInfoRouter";
import { externalApiSearchController } from '../controllers/externalApiSearchController';
import { testController } from '../controllers/testController';
import { apiSearchController } from "../controllers/apiSearchController";

const router = Router();

router.use('/auth', authRouter);
router.use('/user-info', userInfoRouter);
router.get('/api/search', externalApiSearchController);
router.get('/api/address', apiSearchController)
router.get('/api/test', testController);

export default router;

