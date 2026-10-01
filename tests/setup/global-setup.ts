import { execSync } from "node:child_process";
import mariadb from "mariadb";
import { getTestDatabaseUrl } from "./test-database";

/**
 * Exécuté une fois avant tous les tests : crée la base de test si besoin puis
 * y applique les migrations Prisma, pour qu'elle ait exactement le schéma de
 * production.
 */
export default async function globalSetup() {
  const testUrl = getTestDatabaseUrl();
  const url = new URL(testUrl);
  const databaseName = url.pathname.slice(1);

  const connection = await mariadb.createConnection({
    host: url.hostname,
    port: Number(url.port) || 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
  });
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await connection.end();

  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: "pipe",
  });
}
