import { Request, Response } from "express";
import fs from 'fs';
import path from 'path';
import { User, UserRepository } from '../entities';

class UserInfoController {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async getUserInfo(req: Request, res: Response) {
    try {
      const { id, login } = req.user;

      const userData = await this.userRepository.findById(id);
      const { name, phone, birthDate, avatarPath } = userData as User;

      res.status(200).json({ id, login, name, phone, birthDate, avatarPath });
    } catch (error) {
      console.log(error, ' getUserInfo');
      return res.status(401).json({ message: 'Invalid access token' });
    }
  }

  async editUserInfo(req: Request, res: Response) {
    try {
      const { id, login } = req.user;
      const { name, phone, birthDate } = req.body;

      const userData = await this.userRepository.findByLogin(login);

      if (!userData) {
        return res.status(404).json({ message: 'User not found' });
      }

      await this.userRepository.updateUserInfo(id, { name, phone, birthDate });
      res.status(200).json({ message: 'User information updated successfully' });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: 'Error' });
    }
  }

  async uploadAvatar(req: Request, res: Response) {
    try {
      const { id } = req.user;
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const userData = await this.userRepository.findById(id);
      if (!userData) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Удаляем старый аватар, если он существует
      if (userData?.avatarPath) {
        // @FIXME возможно нужна будет проверка, если meme-type не всегда png.
        const oldAvatarPath = path.join(__dirname, '../..', userData.avatarPath);
        // console.log(oldAvatarPath, 'если oldAvatarPath');

        // Удаление старого файла
        fs.unlink(oldAvatarPath, (err) => {
          if (err) {
            console.error('Ошибка при удалении старого файла:', err);
          } else {
            console.log('Старый аватар успешно удален:', oldAvatarPath);
          }
        });
      }

      // @FIXME подумать на счет этого
      // const avatarPath = path.join(__dirname, '../..', userData.avatarPath);

      // Сохраняем путь к новому аватару в базе данных
      const avatarPath = `uploads/avatars/${file.filename}`;
      await this.userRepository.updateUserInfo(id, { avatarPath })

      res.status(200).json({ avatarPath });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: 'Error' });
    }
  }
}

export default UserInfoController;