import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const EMAIL    = process.argv[2];
const NEW_PASS = process.argv[3];

if (!EMAIL || !NEW_PASS) {
  console.error('Uso: npx ts-node src/scripts/change-password.ts <email> <nueva_contraseña>');
  process.exit(1);
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  const db = mongoose.connection.db!;
  const users = db.collection('users');

  const user = await users.findOne({ email: EMAIL });
  if (!user) {
    console.error(`No se encontró ningún usuario con email: ${EMAIL}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const hash = await bcrypt.hash(NEW_PASS, 10);
  await users.updateOne({ email: EMAIL }, { $set: { password: hash } });

  console.log(`Contraseña actualizada correctamente para: ${EMAIL}`);
  await mongoose.disconnect();
}

main().catch(console.error);
