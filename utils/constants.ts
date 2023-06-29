import { Configuration, OpenAIApi } from "openai";

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
export const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
export const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
export const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
export const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const config = new Configuration({ apiKey: OPENAI_API_KEY });

export const openai = new OpenAIApi(config);
