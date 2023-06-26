import { openai } from "./constants";

export const getEmbedding = async (text: string): Promise<number[]> => {
  const embedRes = await openai.createEmbedding({ input: text, model: "text-embedding-ada-002" });

  if (embedRes.data.data[0].embedding) {
    return embedRes.data.data[0].embedding;
  } else {
    return [];
  }
};
