import bcrypt from "bcrypt";
import { Request, Response } from "express";
import { handleServerError } from '../utils/Errors'
import { User, UserRepository, RefreshSessionRepository } from '../entities'
import { TokenService } from "../services/Token";
import { COOKIE_SETTINGS, ACCESS_TOKEN_EXPIRATION } from  "../constants"
import jwt, {JwtPayload} from "jsonwebtoken";
import dotenv from "dotenv"
import axios from "axios";
dotenv.config();

if (!process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
  throw new Error("ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must be defined in environment variables");
}

type TPayload = {
  id: number;
  login: string;
}

class AuthController {
  private userRepository: UserRepository;
  private refreshSessionRepository: RefreshSessionRepository;

  constructor() {
    this.userRepository = new UserRepository();
    this.refreshSessionRepository = new RefreshSessionRepository();
  }

  async signup(req: Request, res: Response) {
    const { login, password, name } = req.body;
    const { fingerprint } = req;

    try {
      const existingUser = await this.userRepository.findByLogin(login);

      if (!fingerprint || !fingerprint.hash) {
        return res.status(401).send('Отсутствует fingerprint');
      }

      // Проверяем, существует ли пользователь с таким логином
      if (existingUser) {
        return res.status(400).send('Пользователь с таким логином (email) уже существует');
      }

      const hashPassword = await bcrypt.hash(password, 8);

      // Создаем и сохраняем нового пользователя
      const newUser = await this.userRepository.createUser({ login, password: hashPassword, name, provider: 'local' });
      const { id } = newUser;

      const [accessToken, refreshToken] = await Promise.all([
        TokenService.generateAccessToken({ id, login }),
        TokenService.generateRefreshToken({ id, login })
      ]);

      // Создаем и сохраняем сессию обновления
      const refreshSessionRepository = await this.refreshSessionRepository.create(newUser, refreshToken, fingerprint.hash)

      //@FIXME возможно лишняя проверка
      if (!refreshSessionRepository) {
        console.error(' refresh сессия не создалась');
      }

      res.cookie('refreshToken', refreshToken, COOKIE_SETTINGS.REFRESH_TOKEN);
      res.status(200).send({ accessToken, accessTokenExpiration: ACCESS_TOKEN_EXPIRATION});
    } catch (error) {
      handleServerError(error as Error, res)
    }
  };

  async signIn(req: Request, res: Response) {
    const { fingerprint } = req;
    const { login, password } = req.body;

    if (!fingerprint || !fingerprint.hash) {
      return res.status(400).send('Fingerprint is missing');
    }

    try {
      const userData = await this.authenticateUser(login, password);
      const { id } = userData;

      const [accessToken, refreshToken] = await Promise.all([
        TokenService.generateAccessToken({ id, login }),
        TokenService.generateRefreshToken({ id, login })
      ]);

      await this.handleSessionLogin(userData, refreshToken, fingerprint);

      res.cookie('refreshToken', refreshToken, COOKIE_SETTINGS.REFRESH_TOKEN);
      res.status(200).json({ accessToken, accessTokenExpiration: ACCESS_TOKEN_EXPIRATION});
    } catch (error) {
      handleServerError(error as Error, res)
    }
  };

  async gmailLogin(req: Request, res: Response) {
    const { fingerprint } = req;
    const { token } = req.body; // Получаем токен из запроса

    if (!fingerprint || !fingerprint.hash) {
      return res.status(400).send('Fingerprint is missing');
    }

    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    try {
      // Проверяем токен и получаем данные пользователя
      const googleResponse = await axios.get(`https://www.googleapis.com/oauth2/v3/userinfo`, {
        headers: { Authorization: `Bearer ${token}`, },
      });

      // если авторизация по gmail не удалась
      if (!googleResponse.data) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { email: login, sub: googleId, given_name: name } = googleResponse.data;

      let userData = await this.userRepository.findByLogin(login);

      // если пользователь не найден по почте, то создаем и сохраняем нового пользователя
      if (!userData) {
        console.log('newUser gmailLogin');
        userData = await this.userRepository.createUser({ login, name, googleId, provider: 'google' })
      }

      const { id } = userData;
      const [accessToken, refreshToken] = await Promise.all([
        TokenService.generateAccessToken({ id, login }),
        TokenService.generateRefreshToken({ id, login })
      ]);

      await this.handleSessionLogin(userData, refreshToken, fingerprint);

      res.cookie('refreshToken', refreshToken, COOKIE_SETTINGS.REFRESH_TOKEN);
      res.status(200).json({ accessToken, accessTokenExpiration: ACCESS_TOKEN_EXPIRATION});

      console.log(userData, 'Google user data');
    } catch (error) {
      // @FIXME поменять валидацию ошибок на нашу
      console.error('Error fetching user data from Google:', error);
      return res.status(401).json({ message: 'Unauthorized' });
    }
  };

  async refresh(req: Request, res: Response) {
    const { fingerprint } = req;
    const currentRefreshToken = req.cookies.refreshToken;
    console.log(currentRefreshToken, ' currentRefreshToken');

    if (!currentRefreshToken) {
      return res.status(400).send('No refresh token provided');
    }

    try {
      const refreshFromDB = await this.refreshSessionRepository.findByRefreshToken(currentRefreshToken);
      console.log(refreshFromDB, ' refresh refreshFromDB');

      if (!fingerprint || !fingerprint.hash) {
        console.error(' refresh ошибка 0');
        return res.status(401).send('Отсутствует fingerprint');
      }

      if (!refreshFromDB) {
        console.error(' refresh ошибка 1');
        return res.status(401).send('Пользователь не авторизован');
      }

      // на случай если угнали токены при рефреше сравниваем fingerprint из базы и fingerprint c запроса
      if (refreshFromDB?.fingerPrint !== fingerprint?.hash) {
        console.error(' refresh ошибка 2')
        return res.status(401).send('Пользователь не авторизован');
      }

      // Удаляем текущую сессию перед созданием новой
      await this.refreshSessionRepository.remove(refreshFromDB);

      const payload = jwt.verify(currentRefreshToken, process.env.REFRESH_TOKEN_SECRET as string) as JwtPayload & TPayload;
      const { id, login } = payload;

      // Генерация токенов параллельно для повышения производительности
      const [newAccessToken, newRefreshToken] = await Promise.all([
        TokenService.generateAccessToken({ id, login }),
        TokenService.generateRefreshToken({ id, login })
      ]);

      // Создание новой сессии и сохранение в базе данных
      const newRefreshSession = await this.refreshSessionRepository.create({ id }, newRefreshToken, fingerprint.hash)
      if (!newRefreshSession) {
        return res.status(500).send('Ошибка создания рефреш сессии');
      }

      // Установка нового refresh токена в куки
      res.cookie("refreshToken", newRefreshToken, COOKIE_SETTINGS.REFRESH_TOKEN);
      // Возвращаем новый access токен и время его истечения
      return res.status(200).json({ accessToken: newAccessToken, accessTokenExpiration: ACCESS_TOKEN_EXPIRATION });
    } catch (error) {
      handleServerError(error as Error, res);
    }
  };

  async logout(req: Request, res: Response) {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(400).send('No refresh token provided');
    }

    try {
      // удаляем табличку refresh сессии в бд
      const refreshSession = await this.refreshSessionRepository.findByRefreshToken(refreshToken);

      if (refreshSession) {
        await this.refreshSessionRepository.remove(refreshSession);
      }

      // очищаем cookie на стороне сервера
      res.clearCookie('refreshToken');

      return res.status(200).send('logout success');
    } catch (error) {
      handleServerError(error as Error, res);
    }
  };

  private async authenticateUser(login: string, password: string) {
    const userData = await this.userRepository.findByLogin(login);

    if (!userData) {
      throw new Error('Пользователь не найден');
    }

    const isPasswordValid = await bcrypt.compare(password, userData.password);
    if (!isPasswordValid) {
      throw new Error('Неправильный пароль');
    }

    return userData;
  }

  private async handleSessionLogin(userData: User, refreshToken: string, fingerprint: any) {
    // Создание и сохранение новой сессии
    const existingSession = await this.refreshSessionRepository.findByUser(userData);

    // в случае если по какой-то причине при выходе рефреш токен остался в базе мы должны его удалить перед созданием нового
    if (existingSession) {
      console.log(existingSession, ' existingSession old error not deleted in last logout!') //@FIXME почистить логи
      await this.refreshSessionRepository.remove(existingSession);
    }

    await this.refreshSessionRepository.create(userData, refreshToken, fingerprint?.hash)
  }
}

export default AuthController;