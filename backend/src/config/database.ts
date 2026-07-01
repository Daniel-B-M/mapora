import mongoose from 'mongoose';

/**
 * Conecta a MongoDB Atlas usando la URI del archivo .env.
 *
 * Cachea la promesa de conexión en el módulo: en un entorno serverless
 * (Vercel) el módulo se reutiliza entre invocaciones "warm" del mismo
 * contenedor, así que solo se conecta una vez por cold start en vez de
 * en cada request.
 */
let connectionPromise: Promise<typeof mongoose> | null = null;

export function connectDatabase(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return Promise.resolve(mongoose);
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI no está definida');
  }

  connectionPromise = mongoose.connect(uri)
    .then((conn) => {
      console.log('✅ Conectado a MongoDB Atlas');
      return conn;
    })
    .catch((error) => {
      connectionPromise = null; // permite reintentar en la próxima invocación
      console.error('❌ Error al conectar a MongoDB:', error);
      throw error;
    });

  mongoose.connection.on('error', (err) => {
    console.error('❌ Error de conexión MongoDB:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB desconectado');
  });

  return connectionPromise;
}
