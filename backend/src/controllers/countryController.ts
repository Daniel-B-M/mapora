import type { Request, Response } from 'express';
import { getAllLatam, getCountryByIso, clearCountryCache } from '../services/countryService';
import { Country } from '../models/Country';

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

/**
 * PATCH /api/countries/:iso/places
 * Body: [{ nombre: string, nombre_en: string }]
 * Actualiza el campo nombre_en de los sitios turísticos de un país.
 */
export async function updatePlaceNames(req: Request, res: Response) {
  try {
    const iso = req.params.iso.toUpperCase();
    const updates: { nombre: string; nombre_en: string }[] = req.body;

    if (!Array.isArray(updates)) {
      res.status(400).json({ error: 'Body debe ser un array de { nombre, nombre_en }' });
      return;
    }

    const country = await Country.findOne({ codigo_iso: iso });
    if (!country) {
      res.status(404).json({ error: 'País no encontrado' });
      return;
    }

    for (const place of country.lugares_turisticos) {
      const match = updates.find((u) => u.nombre === place.nombre);
      if (match) place.nombre_en = match.nombre_en;
    }

    await country.save();
    clearCountryCache(iso);
    res.json({ updated: country.lugares_turisticos });
  } catch (err) {
    console.error('Error actualizando nombres en inglés:', err);
    res.status(500).json({ error: 'Error al actualizar' });
  }
}
