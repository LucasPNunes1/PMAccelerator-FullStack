import { Request, Response } from 'express';
import prisma from '../prismaClient';
import axios from 'axios';

export const searchWeather = async (req: Request, res: Response) => {
  try {
    const { location, startDate, endDate } = req.body;
    if (!location) {
      return res.status(400).json({ error: 'Location is required' });
    }

    let finalStartDate = startDate;
    let finalEndDate = endDate;

    if (finalEndDate && !finalStartDate) {
      return res.status(400).json({ error: 'Start date is required if an end date is provided.' });
    }

    if (finalStartDate && !finalEndDate) {
      const start = new Date(finalStartDate + 'T12:00:00');
      const end = new Date(start);
      end.setDate(start.getDate() + 5);
      finalEndDate = end.toISOString().split('T')[0];
    }

    if (finalStartDate && finalEndDate) {
      const start = new Date(finalStartDate + 'T12:00:00');
      const end = new Date(finalEndDate + 'T12:00:00');
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
      }
      if (start > end) {
        return res.status(400).json({ error: 'Start date must be before or equal to end date' });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const maxForecast = new Date(today);
      maxForecast.setDate(today.getDate() + 15);

      if (end > maxForecast && start >= today) {
        return res.status(400).json({ error: 'Forecast is only available up to 14 days in the future. For historical data, choose a past date range.' });
      }

      const minDate = new Date('1940-01-01');
      if (start < minDate) {
        return res.status(400).json({ error: 'Historical data is only available from 1940 onwards.' });
      }
    }

    const searchName = location.split(',')[0].trim();

    const geoResponse = await axios.get(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchName)}&count=5&format=json`
    );
    
    const results = geoResponse.data.results;
    if (!results || results.length === 0) {
      return res.status(404).json({ error: `Could not find "${searchName}". Try a different spelling or city name.` });
    }

    const geoData = results[0];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = finalStartDate ? new Date(finalStartDate + 'T12:00:00') : today;
    
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(today.getDate() - 90);

    let apiUrl = "https://api.open-meteo.com/v1/forecast";
    let params = `latitude=${geoData.latitude}&longitude=${geoData.longitude}&timezone=auto`;

    if (start < ninetyDaysAgo) {
      apiUrl = "https://archive-api.open-meteo.com/v1/archive";
      const archiveMax = new Date(today);
      archiveMax.setDate(today.getDate() - 2);
      const ArchiveEndDate = new Date(finalEndDate + 'T12:00:00') > archiveMax 
        ? archiveMax.toISOString().split('T')[0] 
        : finalEndDate;

      params += `&start_date=${finalStartDate}&end_date=${ArchiveEndDate}&daily=temperature_2m_max,temperature_2m_min,weather_code`;
    } else {
      params += `&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min,weather_code`;
      if (finalStartDate && finalEndDate) {
        params += `&start_date=${finalStartDate}&end_date=${finalEndDate}`;
      } else {
        params += `&forecast_days=16`;
      }
    }

    const weatherResponse = await axios.get(`${apiUrl}?${params}`);
    
    const temperatureData = JSON.stringify(weatherResponse.data);
    const displayName = `${geoData.name}${geoData.admin1 ? ', ' + geoData.admin1 : ''}${geoData.country ? ', ' + geoData.country : ''}`;

    const searchRecord = await prisma.weatherSearch.create({
      data: {
        location: displayName,
        startDate: finalStartDate || null,
        endDate: finalEndDate || null,
        temperatureData
      }
    });

    res.status(201).json(searchRecord);

  } catch (error: any) {
    console.error('Search error:', error?.response?.data || error?.message || error);
    if (error?.response?.status === 400) {
        return res.status(400).json({ error: error.response.data?.reason || 'Invalid request for this date range.' });
    }
    if (error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'Weather service is temporarily unavailable. Please try again.' });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getHistory = async (req: Request, res: Response) => {
  try {
    const history = await prisma.weatherSearch.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateHistory = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { alias, notes } = req.body;

    if (alias && alias.length > 50) {
      return res.status(400).json({ error: 'Alias must be 50 characters or less' });
    }
    if (notes && notes.length > 500) {
      return res.status(400).json({ error: 'Notes must be 500 characters or less' });
    }

    const updated = await prisma.weatherSearch.update({
      where: { id },
      data: { 
        alias: alias !== undefined ? alias : undefined,
        notes: notes !== undefined ? notes : undefined
      }
    });
    res.status(200).json(updated);
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteHistory = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.weatherSearch.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const exportData = async (req: Request, res: Response) => {
  try {
    const { format } = req.query;
    const history = await prisma.weatherSearch.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const formattedHistory = history.map(h => {
      let maxTemp: number | null = null;
      let minTemp: number | null = null;
      
      if (h.temperatureData) {
        try {
          const parsed = JSON.parse(h.temperatureData);
          maxTemp = parsed?.daily?.temperature_2m_max?.[0] ?? parsed?.current?.temperature_2m ?? null;
          minTemp = parsed?.daily?.temperature_2m_min?.[0] ?? parsed?.current?.temperature_2m ?? null;
        } catch (e) {
          /* ignore JSON parse error */
        }
      }

      return {
        id: h.id,
        location: h.location,
        alias: h.alias || '',
        notes: h.notes || '',
        maxTemp: maxTemp != null ? Math.round(maxTemp) : '',
        minTemp: minTemp != null ? Math.round(minTemp) : '',
        createdAt: h.createdAt
      };
    });

    if (format === 'csv') {
      const csvLines = formattedHistory.map(h => {
        const escapeCSV = (str: string | Date | number) => `"${String(str).replace(/"/g, '""')}"`;
        return `${escapeCSV(h.id)},${escapeCSV(h.location)},${escapeCSV(h.alias)},${escapeCSV(h.notes)},${escapeCSV(h.maxTemp)},${escapeCSV(h.minTemp)},${escapeCSV(h.createdAt)}`;
      });
      const csvHeader = 'id,location,alias,notes,maxTemp,minTemp,createdAt';
      const csv = [csvHeader, ...csvLines].join('\n');
      
      res.header('Content-Type', 'text/csv');
      res.attachment('export.csv');
      return res.status(200).send(csv);
    }
    
    res.header('Content-Type', 'application/json');
    res.attachment('export.json');
    return res.status(200).json(formattedHistory);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
