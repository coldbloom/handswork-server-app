import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from "typeorm";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  login: string;

  @Column({ nullable: true })
  password: string; // Это поле будет использоваться только для пользователей, которые регистрируются через логин и пароль.

  @Column({ nullable: true })
  googleId: string; // Это поле будет использоваться для пользователей, которые аутентифицируются через Google.

  @Column()
  provider: string; // 'local' или 'google'

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  birthDate: string;

  @Column({ nullable: true })
  avatarPath: string;

  @CreateDateColumn({ type: 'date' }) // Указываем тип 'date'
  createdDate: Date; // Используем тип Date для хранения даты
}