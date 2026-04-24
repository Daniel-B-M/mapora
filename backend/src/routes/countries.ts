import { Router } from 'express';
import { listLatam, getCountry, updatePlaceNames } from '../controllers/countryController';

const router = Router();

// GET /api/countries/latam  → todos los países LATAM
router.get('/latam', listLatam);

// GET /api/countries/:iso   → país por código ISO (ej. CO, AR, MX)
router.get('/:iso', getCountry);

// PATCH /api/countries/:iso/places → actualiza nombre_en de sitios turísticos
router.patch('/:iso/places', updatePlaceNames);

export default router;
