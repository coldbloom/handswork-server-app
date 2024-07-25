import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken"
import dotenv from "dotenv"
import {handleServerError} from "../utils/Errors";

dotenv.config();

if (!process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
  throw new Error("ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must be defined in environment variables");
}

type TPayload = {
  id: number;
  login: string;
};

export class TokenService {
  static async generateAccessToken(payload: TPayload) {
    const { id, login } = payload;
    return jwt.sign({id, login}, process.env.ACCESS_TOKEN_SECRET as string, {
      expiresIn: "30m",
    });
  }

  static async generateRefreshToken(payload: TPayload) {
    const { id, login } = payload;
    return jwt.sign({ id, login }, process.env.REFRESH_TOKEN_SECRET as string, {
      expiresIn: "15d",
    });
  }

  static checkAccess(req: Request & { user: any }, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    const token = authHeader?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Access token is missing or invalid' });
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string, (error, user) => {
      if (error) {
        handleServerError(error, res, 403)
      }

      next();
    });
  }
};