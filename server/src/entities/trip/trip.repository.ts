import { Repository } from "typeorm";
import { Trip, TripStatus } from './trip';
import { AppDataSource } from '../../config/data-source';

export class TripRepository {
  private tripRepository: Repository<Trip>;

  constructor() {
    this.tripRepository = AppDataSource.getRepository(Trip);
  }

  async createAndSave(tripData: Partial<Trip>): Promise<Trip> {
    const trip = this.tripRepository.create(tripData);
    return await this.tripRepository.save(trip);
  }

  async findByUserId(userId: number): Promise<Trip[]> {
    return await this.tripRepository.find({ where: { userId }, relations: ['user'] });
  }

  async findActiveTrips(): Promise<Trip[]> {
    return await this.tripRepository.find({
      where: { status: TripStatus.ACTIVE },
      order: { dateTime: 'ASC' } // Сортировка по дате поездки
    });
  }

  async findByDateAndCities(
    date: Date,
    fromCityId: number,
    toCityId: number,
  ): Promise<Trip[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await this.tripRepository
      .createQueryBuilder('trip')
      .select([
        'trip.id',
        'trip.fromCityId',
        'trip.toCityId',
        'trip.fromCityName',
        'trip.toCityName',
        'trip.dateTime',
        'trip.status',
        'trip.availableSeats',
        'trip.price',
        'trip.duration',
        'trip.distance',
        'user.id',
        'user.name'
      ])
      .leftJoin('trip.user', 'user')
      .where('trip.fromCityId = :fromCityId', { fromCityId })
      .andWhere('trip.toCityId = :toCityId', { toCityId })
      .andWhere('trip.dateTime BETWEEN :startOfDay AND :endOfDay', {
        startOfDay,
        endOfDay
      })
      .andWhere('trip.status = :status', { status: TripStatus.ACTIVE })
      .orderBy('trip.dateTime', 'ASC')
      .cache(true) // Включаем кэширование
      .getMany();
  }
}