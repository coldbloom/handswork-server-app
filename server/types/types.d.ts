// src/utils/types.d.ts
import * as express from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: any; // или укажите более конкретный тип, если у вас есть
    }
  }
}