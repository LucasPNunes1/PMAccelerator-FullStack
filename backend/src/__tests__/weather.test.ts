import request from 'supertest';
import app from '../app';
import prisma from '../prismaClient';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Weather API', () => {
  beforeAll(async () => {
    await prisma.weatherSearch.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/weather/search', () => {
    it('should create a weather search based on location (Happy Path)', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          results: [{ name: 'London', latitude: 51.50853, longitude: -0.12574, country: 'United Kingdom' }]
        }
      });

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          current: { temperature_2m: 15 },
          daily: { temperature_2m_max: [18], temperature_2m_min: [10] }
        }
      });

      const res = await request(app)
        .post('/api/weather/search')
        .send({ location: 'London' });
      
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.location).toMatch(/London/i);
      expect(res.body.temperatureData).toBeDefined();
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('should return 400 if location is empty', async () => {
      const res = await request(app)
        .post('/api/weather/search')
        .send({ location: '' });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Location is required/i);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should return 404 if city is not found', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { results: [] }
      });

      const res = await request(app)
        .post('/api/weather/search')
        .send({ location: 'UnknownCityXYZ' });
      
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/Could not find/i);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid date combinations (end date without start date)', async () => {
      const res = await request(app)
        .post('/api/weather/search')
        .send({ location: 'London', endDate: '2023-01-01' });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Start date is required/i);
    });

    it('should return 503 if external weather service fails (Network Error)', async () => {
      mockedAxios.get.mockRejectedValueOnce({ code: 'ENOTFOUND' });

      const res = await request(app)
        .post('/api/weather/search')
        .send({ location: 'London' });
      
      expect(res.status).toBe(503);
      expect(res.body.error).toMatch(/Weather service is temporarily unavailable/i);
    });
  });

  describe('GET /api/weather/history', () => {
    it('should retrieve search history', async () => {
      const res = await request(app).get('/api/weather/history');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1); 
    });
  });

  describe('History Management (PUT & DELETE)', () => {
    let testHistoryId: string;

    beforeAll(async () => {
      const record = await prisma.weatherSearch.create({
        data: {
          location: 'Test City',
          temperatureData: '{}'
        }
      });
      testHistoryId = record.id;
    });

    it('should successfully update history alias and notes (PUT)', async () => {
      const res = await request(app)
        .put(`/api/weather/history/${testHistoryId}`)
        .send({ alias: 'My Trip', notes: 'Great weather!' });
      
      expect(res.status).toBe(200);
      expect(res.body.alias).toBe('My Trip');
      expect(res.body.notes).toBe('Great weather!');
    });

    it('should return 400 if alias is too long', async () => {
      const longAlias = 'a'.repeat(51);
      const res = await request(app)
        .put(`/api/weather/history/${testHistoryId}`)
        .send({ alias: longAlias });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Alias must be 50 characters or less/i);
    });

    it('should successfully delete history (DELETE)', async () => {
      const res = await request(app).delete(`/api/weather/history/${testHistoryId}`);
      expect(res.status).toBe(204);

      const check = await prisma.weatherSearch.findUnique({ where: { id: testHistoryId } });
      expect(check).toBeNull();
    });
  });

  describe('GET /api/weather/export', () => {
    it('should export history as JSON', async () => {
      const res = await request(app).get('/api/weather/export');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should export history as CSV when format=csv is queried', async () => {
      const res = await request(app).get('/api/weather/export?format=csv');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.text).toContain('location,alias,notes');
    });
  });
});
