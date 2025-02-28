import { Router } from "express";
import UserInfoController from "../controllers/userInfoController";
import {TokenService} from "../services/Token";
import { upload } from '../config/multer';

const router = Router();
const userInfo = new UserInfoController();

router.get('/', TokenService.checkAccess, (req, res) => userInfo.getUserInfo(req, res));
router.post('/edit', TokenService.checkAccess, (req, res) => userInfo.editUserInfo(req, res));
router.post('/upload-avatar', TokenService.checkAccess, upload.single('avatar'), (req, res) => userInfo.uploadAvatar(req, res))

export default router;