import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  const db = mongoose.connection.db!;
  const collection = db.collection('users');

  const count = await collection.countDocuments();
  console.log(`\nTotal de documentos en "users": ${count}\n`);

  const docs = await collection.find().limit(3).toArray();
  docs.forEach((doc, i) => {
    console.log(`--- Documento ${i + 1} ---`);
    console.log(JSON.stringify(doc, null, 2));
  });

  await mongoose.disconnect();
}

main().catch(console.error);
