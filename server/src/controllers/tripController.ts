import {Request, Response} from 'express';
import {TripRepository} from '../entities/trip/trip.repository';
import {Trip, TripStatus} from '../entities/trip/trip';

type City = {
  id: string;
  name: string;
  type: string;
  cityTypeFull: string;
  parents: string;
  region: string;
  city: string;
}

type Street = {
  id: string;
  name: string;
  type: string;
  parents: string;
  region: string;
  city: string;
}

type Building = {
  id: string | null;
  name: string;
  type: string;
  parents: string;
  region: string;
  city: string;
}

type Location = {
  city: City;
  street?: Street;
  building?: Building;
}

type TripInfo = {
  locationFrom: Location;
  locationTo: Location;
  dateTime: string;
  passengers: number;
  price: string;
  duration: string;
  distance: number;
  description: string;
}

export class TripController {
  private tripRepository: TripRepository;

  constructor() {
    this.tripRepository = new TripRepository();
  }

  async publishNewTrip(req: Request, res: Response) {
    try {
      const { id: userId } = req.user;
      const tripInfo: TripInfo = req.body;

      // Преобразуем строку ISO в Date
      const dateTime = new Date(tripInfo.dateTime);
      if (isNaN(dateTime.getTime())) {
        throw new Error('Invalid date format');
      }

      // Подготавливаем данные для создания поездки
      const tripData: Partial<Trip> = {
        userId,
        status: TripStatus.ACTIVE,
        fromCityId: Number(tripInfo.locationFrom.city.id),
        fromCityName: tripInfo.locationFrom.city.name,
        fromCityType: tripInfo.locationFrom.city.type,
        fromCityParent: tripInfo.locationFrom.city.parents,
        toCityId: Number(tripInfo.locationTo.city.id),
        toCityName: tripInfo.locationTo.city.name,
        toCityType: tripInfo.locationTo.city.type,
        toCityParent: tripInfo.locationTo.city.parents,
        dateTime: dateTime,
        totalSeats: tripInfo.passengers,
        availableSeats: tripInfo.passengers,
        price: tripInfo.price,
        duration: tripInfo.duration,
        distance: tripInfo.distance,
        description: tripInfo.description ?? null,
      };

      // Добавляем поля только если они есть в запросе
      if (tripInfo.locationFrom.street) {
        tripData.fromStreetType = tripInfo.locationFrom.street.type;
        tripData.fromStreetName = tripInfo.locationFrom.street.name;
      }

      if (tripInfo.locationFrom.building) {
        tripData.fromBuildingType = tripInfo.locationFrom.building.type;
        tripData.fromBuildingName = tripInfo.locationFrom.building.name;
      }

      if (tripInfo.locationTo.street) {
        tripData.toStreetType = tripInfo.locationTo.street.type;
        tripData.toStreetName = tripInfo.locationTo.street.name;
      }

      if (tripInfo.locationTo.building) {
        tripData.toBuildingType = tripInfo.locationTo.building.type;
        tripData.toBuildingName = tripInfo.locationTo.building.name;
      }

      // Создаем и сохраняем поездку
      const newTrip = await this.tripRepository.createAndSave(tripData);

      return res.status(201).json({
        success: true,
        trip: newTrip,
      });
    } catch (error: unknown) {
      console.error('Error creating trip:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create trip',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getTrips(req: Request, res: Response) {
    try {
      const { date, fromCityId, toCityId } = req.query;

      // Проверяем наличие обязательных параметров
      if (!date || !fromCityId || !toCityId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: date, fromCityId, toCityId',
        });
      }

      console.log(date, ' date поездки');

      // Преобразуем дату
      const searchDate = new Date(date as string);
      if (isNaN(searchDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format',
        });
      }

      // Проверяем и преобразуем ID городов
      const fromCityIdNumber = Number(fromCityId);
      const toCityIdNumber = Number(toCityId);

      if (isNaN(fromCityIdNumber) || isNaN(toCityIdNumber)) {
        return res.status(400).json({
          success: false,
          message: 'City IDs must be valid numbers',
        });
      }
      const trips = await this.tripRepository.findByDateAndCities(searchDate, fromCityIdNumber, toCityIdNumber);
      console.log('trips = ', trips)
      return res.json(trips);
    } catch (error: unknown) {
      console.error('Error fetching trips:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch trips',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}