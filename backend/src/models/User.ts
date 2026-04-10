import mongoose, { Schema, type Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  perfil: {
    nombre_completo: string;
    pais_origen: string;
  };
  progreso: {
    paises_visitados: string[];
    total_visitados: number;
    color_marcador: string;
  };
  preferencias: {
    mapa_estilo: string;
    unidad_distancia: string;
  };
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    perfil: {
      nombre_completo: String,
      pais_origen: String,
    },
    progreso: {
      paises_visitados: [String],
      total_visitados: { type: Number, default: 0 },
      color_marcador: { type: String, default: '#2ecc71' },
    },
    preferencias: {
      mapa_estilo: { type: String, default: 'oscuro' },
      unidad_distancia: { type: String, default: 'km' },
    },
  },
  { collection: 'users' },
);

export const User = mongoose.model<IUser>('User', UserSchema);
