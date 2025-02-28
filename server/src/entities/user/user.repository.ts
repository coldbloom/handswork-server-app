import { User } from './user';
import { AppDataSource } from '../../config/data-source';
import { Repository } from 'typeorm';

export class UserRepository {
  private userRepository: Repository<User>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
  }

  // Найти пользователя по id
  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOneBy({ id });
  }

  // Найти пользователя по login
  async findByLogin(login: string): Promise<User | null> {
    return this.userRepository.findOneBy({ login });
  }

  async updateUserInfo(id: number, updates: Partial<User>): Promise<User> {
    const userData = await this.findById(id);
    if (!userData) {
      throw new Error('User not found');
    }

    Object.assign(userData, updates);

    return this.userRepository.save(userData);
  }

  async createUser(data: Partial<User>): Promise<User> {
    const { login, password, name, provider, googleId } = data;
    const newUser = this.userRepository.create({
      login,
      ...(password && { password }),
      name,
      provider,
      ...(googleId && { googleId }),
      createdDate: new Date(),
    });

    return this.userRepository.save(newUser);
  }
}
