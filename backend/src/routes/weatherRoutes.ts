import { Router } from 'express';
import { searchWeather, getHistory, updateHistory, deleteHistory, exportData } from '../controllers/weatherController';
import { getCityAssets } from '../controllers/assetController';

const router = Router();

router.post('/search', searchWeather);
router.get('/city-assets', getCityAssets);
router.get('/history', getHistory);
router.put('/history/:id', updateHistory);
router.delete('/history/:id', deleteHistory);
router.get('/export', exportData);

export default router;
