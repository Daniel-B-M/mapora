import mongoose, { Schema, type Document } from 'mongoose';

export interface ITouristPlace {
  nombre: string;
  nombre_en?: string;
  tipo: string;
  video_id?: string | null;
  video_title?: string;
  video_thumbnail?: string;
  video_search_attempts?: number;
}

export interface ICurrency {
  nombre: string;
  codigo: string;
  simbolo: string;
}

export interface ICountry extends Document {
  pais: string;
  codigo_iso: string;
  idiomas: string[];
  moneda: ICurrency;
  lugares_turisticos: ITouristPlace[];
}

const TouristPlaceSchema = new Schema<ITouristPlace>(
  {
    nombre: String,
    nombre_en: String,
    tipo: String,
    video_id: { type: String, default: undefined },
    video_title: String,
    video_thumbnail: String,
    video_search_attempts: { type: Number, default: 0 },
  },
  { _id: false },
);

const CurrencySchema = new Schema<ICurrency>(
  { nombre: String, codigo: String, simbolo: String },
  { _id: false },
);

const CountrySchema = new Schema<ICountry>(
  {
    pais: { type: String, required: true },
    codigo_iso: { type: String, required: true },
    idiomas: [String],
    moneda: CurrencySchema,
    lugares_turisticos: [TouristPlaceSchema],
  },
  { collection: 'latam' },
);

export const Country = mongoose.model<ICountry>('Country', CountrySchema);
