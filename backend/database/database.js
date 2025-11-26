import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, "data.json");

async function readDb() {
  try {
    const raw = await readFile(DB_PATH, "utf-8");
    if (!raw.trim()) {
      return { users: [], tips: [] };
    }
    const parsed = JSON.parse(raw);

    // If it used to be [], migrate to { users: [], tips: [] }
    if (Array.isArray(parsed)) {
      return { users: [], tips: [] };
    }

    return {
      users: parsed.users ?? [],
      tips: parsed.tips ?? [],
    };
  } catch (err) {
    if (err.code === "ENOENT") {
      return { users: [], tips: [] };
    }
    throw err;
  }
}

async function writeDb(db) {
  const json = JSON.stringify(db, null, 2);
  await writeFile(DB_PATH, json, "utf-8");
}

export { readDb, writeDb };
