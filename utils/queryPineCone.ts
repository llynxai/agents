import { PineconeClient, QueryRequest } from "@pinecone-database/pinecone";

import { PINECONE_API_KEY, PINECONE_ENVIRONMENT, PINECONE_INDEX } from "./constants";
import { getEmbedding } from "./getEmbedding";

export type QueryPineConeInput = {
  queryString: string;
  namespace: string;
  topK: number;
};

export const initializePincone = async () => {
  const pinecone = new PineconeClient();
  await pinecone.init({
    apiKey: PINECONE_API_KEY,
    environment: PINECONE_ENVIRONMENT,
  });

  return pinecone;
};

export const queryPineCone = async ({ queryString, namespace, topK }: QueryPineConeInput) => {
  const queryEmbed = await getEmbedding(queryString);

  const pinecone = await initializePincone();

  const pineconeIndex = pinecone.Index(PINECONE_INDEX);

  if (queryEmbed.length) {
    const queryRequest: QueryRequest = {
      includeMetadata: true,
      includeValues: false,
      namespace,
      topK,
      vector: queryEmbed,
    };

    const queryRes = await pineconeIndex.query({ queryRequest });

    return queryRes.matches || [];
  }

  return [];
};
