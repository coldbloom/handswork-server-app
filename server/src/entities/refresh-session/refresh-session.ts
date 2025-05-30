import {Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn} from 'typeorm';
import { User } from '../user/user'

@Entity()
export class RefreshSession {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User)
  @JoinColumn() // @JoinColumn декоратор, который указывает, что эта сторона связи будет владеть связью.
  user: User

  @Column({ name: 'refresh_token' })
  refreshToken: string;

  @Column({ name: 'finger_print' })
  fingerPrint: string;
}