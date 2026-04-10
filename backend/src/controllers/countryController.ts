import type { Request, Response } from 'express';
import { getAllLatam, getCountryByIso } from '../services/countryService';

export async function listLatam(_req: Request, res: Response) {
  try {
    const countries = await getAllLatam();
    res.json(countries);
  } catch (err) {
    console.error('Error fetching latam countries:', err);
    res.status(500).json({ error: 'Error al obtener los países' });
  }
}

export async function getCountry(req: Request, res: Response) {
  try {
    const country = await getCountryByIso(req.params.iso);
    if (!country) {
      res.status(404).json({ error: 'País no encontrado' });
      return;
    }
    res.json(country);
  } catch (err) {
    console.error('Error fetching country:', err);
    res.status(500).json({ error: 'Error al obtener el país' });
  }
}
