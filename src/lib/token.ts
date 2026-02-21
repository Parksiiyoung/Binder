import { readFile, writeFile } from "fs/promises";
import { join } from "path";

const TOKEN_PATH = join(process.cwd(), ".threads-token");

export async function getStoredToken(): Promise<string | null> {
  try {
    const token = await readFile(TOKEN_PATH, "utf-8");
    return token.trim() || null;
  } catch {
    return null;
  }
}

export async function saveToken(token: string): Promise<void> {
  await writeFile(TOKEN_PATH, token, "utf-8");
}
