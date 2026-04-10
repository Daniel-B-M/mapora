import type { Response } from 'express';
import type { AuthRequest } from '../middlewares/auth';
import { User } from '../models/User';

export async function getMe(req: AuthRequest, res: Response) {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function toggleVisited(req: AuthRequest, res: Response) {
  const { meshName, visited } = req.body;

  if (!meshName || typeof meshName !== 'string' || typeof visited !== 'boolean') {
    res.status(400).json({ error: 'meshName (string) y visited (boolean) requeridos' });
    return;
  }

  try {
    const update = visited
      ? { $addToSet: { 'progreso.paises_visitados': meshName } }
      : { $pull:     { 'progreso.paises_visitados': meshName } };

    const user = await User.findByIdAndUpdate(req.userId, update, { new: true }).select('-password');
    if (!user) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }

    user.progreso.total_visitados = user.progreso.paises_visitados.length;
    await user.save();

    res.json({ paises_visitados: user.progreso.paises_visitados });
  } catch {
    res.status(500).json({ error: 'Error interno' });
  }
}
