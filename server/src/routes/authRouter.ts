import {Router} from "express";
import AuthController from "../controllers/authController";

const router = Router();

router.post("/sign-up", AuthController.signup)
router.post("/sign-in", AuthController.signIn)
router.post("/refresh", AuthController.refresh)
router.post("/logout", AuthController.logout)

export default router;