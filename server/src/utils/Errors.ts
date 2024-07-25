import { Response } from "express";

export function handleServerError(error: Error, res: Response, status: number = 500) {
  console.error(error);
  return res.status(status).json({ error: `Server error: ${error.message}` });
}