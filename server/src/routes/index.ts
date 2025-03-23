import { Router } from "express";

import authRouter from "./authRouter"
import userInfoRouter from "./userInfoRouter";
import { testController } from '../controllers/testController';
import { apiSearchController } from "../controllers/apiSearchController";
import { apiRouteDetailsController } from "../controllers/apiRouteDetailsController";
import tripRouter from "./tripRouter";

const router = Router();

router.use('/auth', authRouter);
router.use('/user-info', userInfoRouter);
router.use('/trip', tripRouter);
// router.get('/api/search', externalApiSearchController);
router.get('/api/address', apiSearchController)
router.get('/api/test', testController);
router.get('/api/route-detail', apiRouteDetailsController);

export default router;

