import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  JoinColumn,
  ManyToOne,
  Index,
  BeforeInsert, RelationId
} from "typeorm";
import { User } from '../user/user'

export enum TripStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}


@Entity('trip')
@Index(['fromCityId', 'toCityId', 'dateTime']) // Индекс для быстрого поиска
@Index(['status']) // Индекс для фильтрации по статусу
export class Trip {
  @PrimaryGeneratedColumn()
  id: number;

  @RelationId<Trip>(trip => trip.user)
  @Column({ name: 'user_id', type: 'int', nullable: false })
  userId: number;

  @Column({
    type: 'enum',
    enum: TripStatus,
    default: TripStatus.ACTIVE
  })
  status: TripStatus;

  @Column({ name: 'from_city_id', type: 'int', nullable: false })
  @Index()
  fromCityId: number;

  @Column({ name: 'to_city_id', type: 'int', nullable: false })
  @Index()
  toCityId: number;

  @Column({ name: 'from_city_name', nullable: false })
  fromCityName: string;

  @Column({ name: 'from_city_type', nullable: false })
  fromCityType: string;

  @Column({ name: 'from_city_parent', nullable: true })
  fromCityParent: string;

  @Column({ name: 'to_city_name', nullable: false })
  toCityName: string;

  @Column({ name: 'to_city_type', nullable: false })
  toCityType: string;

  @Column({ name: 'to_city_parent', nullable: true })
  toCityParent: string;

  @Column({ name: 'from_street_type', nullable: true })
  fromStreetType: string;

  @Column({ name: 'from_street_name', nullable: true })
  fromStreetName: string;

  @Column({ name: 'to_street_type', nullable: true })
  toStreetType: string;

  @Column({ name: 'to_street_name', nullable: true })
  toStreetName: string;

  @Column({ name: 'from_building_type', nullable: true })
  fromBuildingType: string;

  @Column({ name: 'from_building_name', nullable: true })
  fromBuildingName: string;

  @Column({ name: 'to_building_type', nullable: true })
  toBuildingType: string;

  @Column({ name: 'to_building_name', nullable: true })
  toBuildingName: string;

  @Column({ name: 'date_time', type: 'timestamptz', nullable: false })
  dateTime: Date;

  // Общее количество мест
  @Column({ name: 'total_seats', nullable: false, default: 4 })
  totalSeats: number;

  // Количество доступных для бронирования мест
  @Column({ name: 'available_seats', nullable: false })
  availableSeats: number;

  @BeforeInsert()
  setInitialAvailableSeats() {
    if (this.availableSeats == null) {
      this.availableSeats = this.totalSeats;
    }
  }

  @Column({ nullable: false })
  price: string;

  @Column({ nullable: false })
  duration: string;

  @Column({ nullable: false })
  distance: number;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => User, user => user.trips) // Указываем, что у Trip есть связь с User
  @JoinColumn({ name: 'user_id' })
  user: User;
}