import axios from "axios";
import { getEnvKey } from "./env";

export async function callApiNinjas(endpoint: string, params: any = {}): Promise<any> {
  const apiKey = getEnvKey("API_NINJAS_KEY");
  try {
    const res = await axios.get(`https://api.api-ninjas.com/v1/${endpoint}`, {
      params,
      headers: { "X-Api-Key": apiKey },
      timeout: 15000,
    });
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`API Ninjas error (${error.response?.status}): ${error.response?.data?.message || error.message}`);
    }
    throw new Error(`API Ninjas fetch failed: ${(error as Error).message}`);
  }
}