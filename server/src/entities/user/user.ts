import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from "typeorm";
import { Trip } from '../trip/trip';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  login: string;

  @Column({ nullable: true })
  password: string; // Это поле будет использоваться только для пользователей, которые регистрируются через логин и пароль.

  @Column({ name: 'google_id', nullable: true })
  googleId: string; // Это поле будет использоваться для пользователей, которые аутентифицируются через Google.

  @Column()
  provider: string; // 'local' или 'google'

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ name: 'birth_date', nullable: true })
  birthDate: string;

  @Column({ name: 'avatar_path', nullable: true })
  avatarPath: string;

  @CreateDateColumn({ name: 'created_date ', type: 'date' }) // Указываем тип 'date'
  createdDate: Date; // Используем тип Date для хранения даты

  @OneToMany(() => Trip, trip => trip.user) // Указываем, что у User может быть много Trip
  trips?: Trip[]; // Массив поездок
}