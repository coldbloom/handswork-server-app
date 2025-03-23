import { Request, Response } from "express";

export class TripController {
  async publishNewTrip(req: Request, res: Response) {
    try {
      console.log('что мы отправили? ', req.body)
    } catch (error) {

    }
  }
}