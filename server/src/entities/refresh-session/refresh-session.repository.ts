import { RefreshSession } from './refresh-session';
import { AppDataSource } from '../../config/data-source';
import { Repository } from 'typeorm';
import { User } from "../user/user";

export class RefreshSessionRepository {
  private refreshSessionRepository: Repository<RefreshSession>;

  constructor() {
    this.refreshSessionRepository = AppDataSource.getRepository(RefreshSession);
  }

  // Найти сессию по refreshToken
  async findByRefreshToken(refreshToken: string): Promise<RefreshSession | null> {
    return this.refreshSessionRepository.findOneBy({ refreshToken });
  }

  async findByUser(user: User): Promise<RefreshSession | null> {
    return this.refreshSessionRepository.findOneBy({ user })
  }

  // Создать и сохранить новую сессию
  async create(
    user: User | { id: number }, // Принимаем объект пользователя или его ID
    refreshToken: string,
    fingerPrint: string
  ): Promise<RefreshSession> {
    const newSession = this.refreshSessionRepository.create({
      user,
      refreshToken,
      fingerPrint,
    });

    return this.refreshSessionRepository.save(newSession);
  }

  async remove(refreshSession: RefreshSession): Promise<void> {
    await this.refreshSessionRepository.remove(refreshSession);
  }
}