import {Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn} from 'typeorm';
import { User } from './User'

@Entity()
export class RefreshSession {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User)
  @JoinColumn() // @JoinColumn декоратор, который указывает, что эта сторона связи будет владеть связью.
  user: User

  @Column()
  refreshToken: string;

  @Column()
  fingerPrint: string;
}