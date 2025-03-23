import { Request, Response } from "express";
import dotenv from 'dotenv';
import axios from "axios";

dotenv.config();

type Params = {
  from: string;
  to: string
}

//*
// бесплатный тариф 1000 запросов в сутки
// @FIXME в будущем реализовать сценарий на случай если лимит запросов будет исчерпан
// https://developer.tech.yandex.ru/services/3
// https://yandex.ru/maps-api/support
// */
const API_URL = 'https://geocode-maps.yandex.ru/1.x';
const API_KEY = process.env.YANDEX_API_KEY || 'bdf0f75b-7444-45f8-808d-fd5f2abdc77d';

//*
// полностью бесплатное API, возвращает расстояние в метрах и время в секундах для преодоления маршрута на автомобиле по заданным координатам
// https://project-osrm.org/docs/v5.24.0/api/#
// */
const OSRM_API_URL = 'http://router.project-osrm.org/route/v1/driving';

export const apiRouteDetailsController = async (req: Request, res: Response) => {
  const { from, to } = req.query.params as Params;

  if (!from || !to) {
    res.status(400).json({ message: 'from and to location is required!' })
  }

  try {
    const detailsFrom: any = await axios.get(`${API_URL}/?apikey=${API_KEY}&geocode=${from}&format=json`);
    const derailsTo: any = await axios.get(`${API_URL}/?apikey=${API_KEY}&geocode=${to}&format=json`);

    const pointFrom = detailsFrom.data.response.GeoObjectCollection.featureMember[0].GeoObject.Point.pos.replace(' ', ',');
    const pointTo = derailsTo.data.response.GeoObjectCollection.featureMember[0].GeoObject.Point.pos.replace(' ', ',');
    console.log(from);
    console.log('pointFrom = ', pointFrom);
    console.log(to);
    console.log('pointTo = ', pointTo);

    const routeDetails: any = await axios.get(`${OSRM_API_URL}/${pointFrom};${pointTo}?overview=false`);
    console.log(routeDetails.data);
    console.log('legs = ', routeDetails.data.routes[0].legs);

    const { duration, distance } = routeDetails.data.routes[0];

    res.status(200).json( { duration, distance } );
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Server error from apiRouteDetailsController' });
  }
}