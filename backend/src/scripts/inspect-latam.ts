/**
 * Script temporal para inspeccionar la estructura de los documentos
 * en la colección "latam" de mundo_db.
 *
 * Uso: npx ts-node src/scripts/inspect-latam.ts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI no definida');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Conectado a mundo_db');

  const db = mongoose.connection.db;
  if (!db) {
    console.error('No se pudo obtener la instancia de la DB');
    process.exit(1);
  }

  const collection = db.collection('latam');

  const count = await collection.countDocuments();
  console.log(`\nTotal de documentos en "latam": ${count}\n`);

  const docs = await collection.find().limit(3).toArray();
  docs.forEach((doc, i) => {
    console.log(`--- Documento ${i + 1} ---`);
    console.log(JSON.stringify(doc, null, 2));
    console.log('');
  });

  await mongoose.disconnect();
}

main().catch(console.error);
