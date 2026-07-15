// Usage local   : node scripts/creer-utilisateur.js email@exemple.com motDePasse
// Usage prod    : DATABASE_URL="postgresql://...familyhubdb?sslmode=require" node scripts/creer-utilisateur.js email@exemple.com motDePasse
import "dotenv/config";
import pg from "pg";
import bcrypt from "bcrypt";

const [, , email, password] = process.argv;

if (!email || !password) {
  console.error("Usage: node scripts/creer-utilisateur.js <email> <mot de passe>");
  process.exit(1);
}

const db = process.env.DATABASE_URL
  ? new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : new pg.Client({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    });

await db.connect();

const hash = await bcrypt.hash(password, 10);
const result = await db.query(
  "INSERT INTO users (email, password) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET password = $2 RETURNING id, email",
  [email, hash]
);

console.log("Utilisateur créé/mis à jour :", result.rows[0]);
await db.end();
