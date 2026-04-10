import mongoose from 'mongoose';

/**
 * Conecta a MongoDB Atlas usando la URI del archivo .env
 * Reintentos automáticos están manejados por Mongoose internamente.
 */
export async function connectDatabase(): Promise<void> {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error('❌ MONGO_URI no está definida en .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('✅ Conectado a MongoDB Atlas');
  } catch (error) {
    console.error('❌ Error al conectar a MongoDB:', error);
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    console.error('❌ Error de conexión MongoDB:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB desconectado');
  });
}
