import { Router } from "express";
import AuthController from "../controllers/authController";

const router = Router();
const auth = new AuthController();

router.post("/sign-up", (req, res) => auth.signup(req, res));
router.post("/sign-in", (req, res) => auth.signIn(req, res));
router.post("/refresh", (req, res) => auth.refresh(req, res));
router.post("/logout", (req, res) => auth.logout(req, res));
router.post("/gmail-login", (req, res) => auth.gmailLogin(req, res));

export default router;