import dotenv from 'dotenv';
dotenv.config();

import { DataSource } from "typeorm"
import { User, RefreshSession, Trip } from "../entities";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: "localhost",
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: true,
  logging: true,
  entities: [User, RefreshSession, Trip],
  //entities: ['src/entities/*.{ts}'],
  subscribers: [],
  migrations: [],
})