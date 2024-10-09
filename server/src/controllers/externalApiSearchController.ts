import { Request, Response } from 'express';
import https from 'https';

const API_URL = 'https://kladr-api.ru/api.php';
const API_TOKEN = '3aK4QF422845ZT6RasdB5bDs8nrNKGSh';

export const externalApiSearchController = (req: Request, res: Response) => {
  const {
    query = '',
    contentType = 'city',
    withParent = '1',
    limit = '10',
    cityId,
    streetId,
  } = req.query as { query?: string; contentType?: string; limit?: string; withParent?: string; cityId?: string, streetId?: string }; // Деструктуризация с явной типизацией

  // Сформировать URL для запроса
  const url = new URL(API_URL);
  url.searchParams.append('query', query);
  //url.searchParams.append('typeCode', typeCode); // Устанавливаем его здесь
  url.searchParams.append('contentType', contentType);
  url.searchParams.append('limit', limit);
  url.searchParams.append('withParent', withParent);
  url.searchParams.append('token', API_TOKEN);

  if (contentType === 'street' && cityId) {
    url.searchParams.append('cityId', cityId);
  }

  if (contentType === 'building' && streetId) {
    url.searchParams.append('streetId', streetId);
  }

  //console.log('777', url.searchParams);

  https.get(url.toString(), (apiRes) => {
    let data = '';

    // Собираем данные
    apiRes.on('data', (chunk) => {
      data += chunk;
    });

    // Завершаем обработку данных
    apiRes.on('end', () => {
      try {
        // Парсинг данных
        const parsedData = JSON.parse(data);

        let filteredResults;

        if (contentType === 'city') {
          // Список типов, которые нужно исключить
          const excludedTypes = new Set(["д", "х", "автодорога", "тер", "снт"]);

          // Фильтрация результата
          filteredResults = parsedData.result.filter((item: any) => {
            const nameMatches = item.name.toLowerCase().startsWith(query.toLowerCase());
            const typeExcluded = excludedTypes.has(item.typeShort);
            return nameMatches && !typeExcluded;
          });
        } else {
          // Фильтрация результата
          filteredResults = parsedData.result.filter((item: any) => {
            return item.name.toLowerCase().startsWith(query.toLowerCase());
          });
          console.log(filteredResults, ' дома')
        }

        // Формируем ответ
        res.json({ searchContext: parsedData.searchContext, result: filteredResults });
      } catch (error) {
        console.error(error, ' Ошибка kladr');
        res.status(500).json({ error: 'Ошибка при обработке данных' });
      }
    });

  }).on('error', (err) => {
    res.status(500).json({ error: 'Ошибка при запросе к API' });
  });
};
