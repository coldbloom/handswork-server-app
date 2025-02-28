import dotenv from 'dotenv';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import fingerprint from 'express-fingerprint';
import path from 'path';
import "reflect-metadata" // для typeORM

import { AppDataSource } from "./config/data-source";
import { TokenService } from "./services/Token";
import router from './routes';

dotenv.config(); // используется для загрузки переменных среды из файла .env и их добавления в объект process.env в приложении Node.js

const PORT = process.env.PORT;
// const CLIENT_URL = process.env.CLIENT_URL;

// Разрешённые адреса
const allowedOrigins = [process.env.CLIENT_URL, 'http://localhost:3031'];

const app = express();

app.use(express.json());
app.use(cookieParser());
// app.use(cors( { credentials: true, origin: CLIENT_URL }));
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(fingerprint());

// Middleware для статических файлов
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/', router);

//@ts-ignore
app.get("/resource/protected", TokenService.checkAccess, (_, res) => {
  return res.status(200).json("Добро пожаловать " + Date.now());
});

// Обработка 404 ошибок
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found' });
});

// Запуск сервера
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





