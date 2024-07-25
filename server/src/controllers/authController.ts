import bcrypt from "bcrypt";
import { Request, Response } from "express";
import { handleServerError } from '../utils/Errors'
import { User, RefreshSession } from '../entities'
import { AppDataSource} from "../data-source";
import { TokenService } from "../services/Token";
import { COOKIE_SETTINGS, ACCESS_TOKEN_EXPIRATION } from  "../constants"
import jwt, {JwtPayload} from "jsonwebtoken";
import dotenv from "dotenv"
dotenv.config();

if (!process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
  throw new Error("ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must be defined in environment variables");
}

type TPayload = {
  id: number;
  login: string;
}

class AuthController {
  static async signup(req: Request, res: Response) {
    const { login, password } = req.body;
    const { fingerprint } = req;

    try {
      const userRepository = AppDataSource.getRepository(User);
      const existingUser = await userRepository.findOne({ where: {login} });

      // Проверяем, существует ли пользователь с таким логином
      if (existingUser) {
        return res.status(400).send('Пользователь с таким логином уже существует');
      }

      const hashPassword = await bcrypt.hash(password, 8);

      // Создаем и сохраняем нового пользователя
      const newUser = userRepository.create({ login, password: hashPassword });
      await userRepository.save(newUser);

      const { id } = newUser;

      const [accessToken, refreshToken] = await Promise.all([
        TokenService.generateAccessToken({ id, login }),
        TokenService.generateRefreshToken({ id, login })
      ]);

      // Создаем и сохраняем сессию обновления
      const refreshSessionRepository = AppDataSource.getRepository(RefreshSession);
      const refreshSession = refreshSessionRepository.create({
        user: newUser,
        refreshToken,
        fingerPrint: fingerprint?.hash
      });
      await refreshSessionRepository.save(refreshSession);

      res.cookie('refreshToken', refreshToken, COOKIE_SETTINGS.REFRESH_TOKEN);
      res.status(200).send({ accessToken, accessTokenExpiration: ACCESS_TOKEN_EXPIRATION});
    } catch (error) {
      handleServerError(error as Error, res)
    }
  };

  static async signIn(req: Request, res: Response) {
    const { fingerprint } = req;
    const { login, password } = req.body;

    if (!fingerprint || !fingerprint.hash) {
      return res.status(400).send('Fingerprint is missing');
    }

    try {
      const userRepository = AppDataSource.getRepository(User);
      const userData = await userRepository.findOneBy({ login });

      if (!userData) {
        return res.status(404).send('Пользователь не найден');
      }

      // используется вместо синхронного bcrypt.compareSync, что улучшает производительность и предотвращает блокировку потока.
      const isPasswordValid = await bcrypt.compare(password, userData.password);

      if (!isPasswordValid) {
        return res.status(401).send('Неправильный логин или пароль');
      }

      const { id } = userData;

      const [accessToken, refreshToken] = await Promise.all([
        TokenService.generateAccessToken({ id, login }),
        TokenService.generateRefreshToken({ id, login })
      ]);

      // Создание и сохранение новой сессии
      const refreshSessionRepository = AppDataSource.getRepository(RefreshSession);
      const refreshSession = refreshSessionRepository.create({
        user: userData,
        refreshToken,
        fingerPrint: fingerprint?.hash
      });
      await refreshSessionRepository.save(refreshSession);

      res.cookie('refreshToken', refreshToken, COOKIE_SETTINGS.REFRESH_TOKEN);
      res.status(200).json({ accessToken, accessTokenExpiration: ACCESS_TOKEN_EXPIRATION});
    } catch (error) {
      handleServerError(error as Error, res)
    }
  };

  static async refresh(req: Request, res: Response) {
    const { fingerprint } = req;
    const currentRefreshToken = req.cookies.refreshToken;

    if (!currentRefreshToken) {
      return res.status(400).send('No refresh token provided');
    }

    try {
      const refreshSessionRepository = AppDataSource.getRepository(RefreshSession);
      const refreshFromDB = await refreshSessionRepository.findOneBy({ refreshToken: currentRefreshToken });

      if (!refreshFromDB) {
        return res.status(401).send('Пользователь не авторизован');
      }

      // на случай если угнали токены при рефреше сравниваем fingerprint из базы и fingerprint c запроса
      if (refreshFromDB?.fingerPrint !== fingerprint?.hash) {
        return res.status(401).send('Пользователь не авторизован');
      }

      // Удаляем текущую сессию перед созданием новой
      await refreshSessionRepository.remove(refreshFromDB);

      const payload = jwt.verify(currentRefreshToken, process.env.REFRESH_TOKEN_SECRET as string) as JwtPayload & TPayload;
      const { id, login } = payload;

      // Генерация токенов параллельно для повышения производительности
      const [newAccessToken, newRefreshToken] = await Promise.all([
        TokenService.generateAccessToken({ id, login }),
        TokenService.generateRefreshToken({ id, login })
      ]);

      // Создание новой сессии и сохранение в базе данных
      const newRefreshSession = refreshSessionRepository.create({
        user: { id }, // используем объект пользователя или его ID
        refreshToken: newRefreshToken,
        fingerPrint: fingerprint?.hash
      });
      await refreshSessionRepository.save(newRefreshSession);

      // Установка нового refresh токена в куки
      res.cookie("refreshToken", newRefreshToken, COOKIE_SETTINGS.REFRESH_TOKEN);
      // Возвращаем новый access токен и время его истечения
      return res.status(200).json({ accessToken: newAccessToken, accessTokenExpiration: ACCESS_TOKEN_EXPIRATION });
    } catch (error) {
      handleServerError(error as Error, res);
    }
  };

  static async logout(req: Request, res: Response) {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(400).send('No refresh token provided');
    }

    try {
      // удаляем табличку refresh сессии в бд
      const refreshSessionRepository = AppDataSource.getRepository(RefreshSession);
      const refreshSession = await refreshSessionRepository.findOneBy({ refreshToken });

      if (refreshSession) {
        await refreshSessionRepository.remove(refreshSession);
      }

      // очищаем cookie на стороне сервера
      res.clearCookie('refreshToken');

      return res.status(200).send('logout success');
    } catch (error) {
      handleServerError(error as Error, res);
    }
  };
}

export default AuthController;