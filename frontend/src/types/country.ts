/** Datos de un país que se muestran en el modal de información */
export interface CountryMedia {
  /** URL de la imagen o del embed de YouTube */
  src: string;
  /** Texto alternativo o título del recurso */
  alt: string;
  /** Thumbnail para videos de YouTube */
  thumbnail?: string;
}

export interface CountryData {
  /** Identificador del mesh en el modelo 3D */
  meshName: string;
  /** Nombre presentable del país */
  displayName: string;
  /** Imágenes del país */
  images: CountryMedia[];
  /** Videos del país */
  videos: CountryMedia[];
  /** Viñetas columna izquierda: país, moneda, idiomas */
  infoGeneral: string[];
  /** Viñetas columna derecha: lugares turísticos */
  lugaresTuristicos: string[];
  /** Si el usuario ya marcó el país como visitado */
  visited: boolean;
}
