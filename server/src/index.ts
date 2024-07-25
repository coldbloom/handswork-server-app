import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import fingerprint from 'express-fingerprint';
import "reflect-metadata" // для typeORM

import { AppDataSource } from "./data-source";
import { TokenService } from "./services/Token";
import router from './routes';

dotenv.config(); // используется для загрузки переменных среды из файла .env и их добавления в объект process.env в приложении Node.js

const PORT = process.env.PORT;
const CLIENT_URL = process.env.CLIENT_URL;

const app = express();

app.use(cookieParser());
app.use(express.json());
app.use(cors( { credentials: true, origin: CLIENT_URL }));
app.use(fingerprint());

app.use('/', router);

// @ts-ignore
app.get("/resource/protected", TokenService.checkAccess, (_, res) => {
  return res.status(200).json("Добро пожаловать " + Date.now());
});

const start = async () => {
  try {
    await AppDataSource.initialize();
    console.log("AppDataSource initialized");

    app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
  } catch (err) {
    console.error("Error during Data Source initialization", err);
  }
};

start();





