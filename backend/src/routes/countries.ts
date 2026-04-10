import { Router } from 'express';
import { listLatam, getCountry } from '../controllers/countryController';

const router = Router();

// GET /api/countries/latam  → todos los países LATAM
router.get('/latam', listLatam);

// GET /api/countries/:iso   → país por código ISO (ej. CO, AR, MX)
router.get('/:iso', getCountry);

export default router;
