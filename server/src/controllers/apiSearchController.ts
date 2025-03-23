import { Request, Response } from 'express';
import axios, { AxiosResponse } from 'axios';
import dotenv from 'dotenv';
import {handleServerError} from "../utils/Errors";

dotenv.config(); // используется для загрузки переменных среды из файла .env и их добавления в объект process.env в приложении Node.js

type LocationTypes = 'city' | 'street' | 'house';

interface QueryParams {
  query?: string;
  location?: LocationTypes;
  limit?: number;
  region?: string;
  city?: string;
  settlement?: string;
  streetId?: string;
}

interface SuggestionData {
  postal_code?: string;
  settlement_type_full?: string;
  settlement?: string;
  region?: string;
  city?: string;
  street_fias_id?: string;
  street?: string;
  street_type?: string;
  region_with_type?: string;
  city_with_type?: string;
  house_fias_id?: string;
  house?: string;
  block_type?: string;
  block?: string;
  house_type?: string;
  street_with_type?: string;
  settlement_with_type?: string;
  city_type_full?: string;
}

interface Suggestion {
  unrestricted_value: string;
  data: SuggestionData;
}

interface DaDataResponse {
  suggestions: Suggestion[];
}

interface Location {
  id: string;
  type: string;
  name: string;
  parents: string;
  region: string;
  city: string;
}

const API_URL = 'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address';
const API_KEY = process.env.DADATA_API_KEY || '51cd66a0fb9915ecc5edf4ee025c3e17ea8f1993';

const formatCityData = (suggestion: Suggestion) => {
  const { unrestricted_value: value, data } = suggestion;
  const arrValue = value.split(', ').slice(0, 4)
  const parents = arrValue.slice(1, arrValue.length - 1).join(', '); // Конкатенация всех элементов, кроме первого и последнего
  const [type, name] = arrValue[arrValue.length - 1].split(' ');
  let city = null;
  let settlement = null; // если тип населенного пункта не город
  let cityTypeFull = null;
  let settlementTypeFull = null;

  const region = data.region;
  if (type === 'г') {
    city = data.city;
    cityTypeFull = data.city_type_full;
  } else {
    settlement = name;
    settlementTypeFull = data.settlement_type_full;
  }

  return  {
    id: arrValue[0],
    type,
    name,
    parents,
    region,
    ...(city && { city: city}),
    ...(settlement && { settlement: settlement }),
    ...(cityTypeFull && { cityTypeFull: cityTypeFull }),
    ...(settlementTypeFull && { settlementTypeFull: settlementTypeFull }),
  };
}

const formatStreetData = (suggestion: Suggestion) => {
  const { data } = suggestion;

  const id = data.street_fias_id;
  const name = data.street;
  const type = data.street_type;
  const region = data.region;
  const city = data.city || data.settlement;
  let parents = null;

  // если ищем улицу в населенном пункте, а не в городе
  if (data.settlement_with_type) {
    parents = data.settlement_with_type;
  } else {
    if (data.region_with_type === data.city_with_type) {
      parents = (data.region_with_type || '').trim();
    } else {
      parents = `${data.region_with_type || ''}, ${data.city_with_type || ''}`.trim();
    }
  }

  return  { id, type, name, parents, region, city };
}

const formatHouseData = (suggestion: Suggestion) => {
  const { data } = suggestion;

  const id = data.house_fias_id;
  const name = `${data.house} ${data.block_type || ''} ${data.block || ''}`.trim();
  const type = data.house_type;
  const region = data.region;
  const city = data.city;
  const parents = `${data.city_with_type || ''}, ${data.street_with_type || ''}`.trim();

  return  { id, type, name, parents, region, city };
}

const processSuggestions = (suggestions: Suggestion[], location: LocationTypes): any[] => {
  const result: any[] = [];

  switch(location) {
    case 'city':
      for (let i = 0; i < suggestions.length; i++) {
        const suggestion = suggestions[i];
        if (
          suggestion.data.postal_code &&
          (!suggestion.data.settlement_type_full || !suggestion.data.settlement_type_full.includes('тер'))
        ) {
          result.push(formatCityData(suggestion));
        }
      }
      return result;

    case 'street':
      for (let i = 0; i < suggestions.length; i++) {
        const suggestion = suggestions[i];
        const streetData = formatStreetData(suggestion);
        if (streetData.type && !['км', 'ш', 'проезд'].includes(streetData.type)) {
          result.push(formatStreetData(suggestions[i]));
        }
      }
      return result;

    case 'house':
      for (let i = 0; i < suggestions.length; i++) {
        result.push(formatHouseData(suggestions[i]));
      }
      return result;

    default:
      return [];
  }
};

export const apiSearchController = async (req: Request, res: Response) => {
  const {
    query = '',
    location = 'city',
    limit = 10,
    region,
    city,
    settlement,
    streetId
  } = req.query as QueryParams;

  // Input Validation
  if (!query.trim()) {
    return res.status(400).json({ error: 'Query parameter is required.' });
  }

  // 400 означает "Bad Request" (Плохой запрос) - отсутствие обязательных параметров
  if (location === 'street' && !region?.trim()) {
    return res.status(400).json({ error: 'Region parameter is required for street location.' });
  }

  if (location === 'house' && !streetId?.trim()) {
    return res.status(400).json({ error: 'streetId parameter is required for house location.' });
  }

  const requestData: { [key: string]: any } = {
    query: query.trim(),
    count: limit,
  };

  switch (location) {
    case 'city':
      requestData.from_bound = { value: 'city' };
      requestData.to_bound = { value: 'settlement' };
      break;
    case 'street':
      requestData.from_bound = { value: 'street' };
      requestData.to_bound = { value: 'street' };
      requestData.locations = [
        {
          region: region,
          ...(city && { city: city }), // Include 'city' only if it's provided
          ...(settlement && { settlement: settlement }),
        },
      ];
      break;
    case 'house':
      requestData.from_bound = { value: 'house' };
      requestData.locations = [
        {
          street_fias_id: streetId,
        },
      ];
      requestData.restrict_value = true;
      break;
    default:
      return res.status(400).json({ error: 'Invalid location parameter.' });
  }

  try {
    const response: AxiosResponse<DaDataResponse> = await axios.post(API_URL, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Token ${API_KEY}` // Указываем API-ключ
      },
      timeout: 5000, // Установка таймаута гарантирует, что ваше приложение не застрянет в ожидании внешнего сервиса, который может быть нерабочим или медленным. В данном случае таймаут: 5000 устанавливает 5-секундный лимит для завершения запроса.
    });

    if (!response.data || !Array.isArray(response.data.suggestions)) {
      return res.status(502).json({ error: 'Invalid response from DaData API.' });
    }

    const formattedData = processSuggestions(response.data.suggestions, location);

    //console.log(JSON.stringify(response.data, null, 2), ' - ПОЛНЫЙ ОТВЕТ');
    //console.log(arrayData, ' arrayData');
    res.json(formattedData); // Отправляем ответ клиенту
  } catch (error) {
    console.error(error);
    if (axios.isAxiosError(error) && error.response) {
      // Если ошибка от API DaData, отправляем статус и сообщение
      res.status(error.response.status).json({ error: error.response.data });
    } else {
      // Общая ошибка
      res.status(500).json({ error: 'Ошибка при получении данных' });
    }
  }
}