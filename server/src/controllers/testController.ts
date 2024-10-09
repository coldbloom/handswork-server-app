import {Request, Response} from "express";

export const testController = (req: Request, res: Response) => {
  console.log('Контроллер вызван'); // Проверяем, срабатывает ли контроллер

  res.status(200).json( {message: 'testController done'} );
}