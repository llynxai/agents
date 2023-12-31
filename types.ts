import { BaseLanguageModel } from "langchain/base_language";

import { PreviousStepContext } from "./api/types";

export type CRUD = "READ" | "CREATE" | "UPDATE" | "DELETE" | "NONE";

export type AgentAction = {
  index: string;
  action: string;
  final_tool?: "Google Calendar" | "Zoom" | "Gmail";
  tool_category: string;
  operation: CRUD;
  type: Classifications;
  schema_description?: string;
  schema_endpoint?: string;
  schema_method?: RequestMethod;
  schema_subtool?: string;
  schema?: string;
};

export interface AgentOptions {
  action: AgentAction;
  model?: BaseLanguageModel;
  modelName?: "gpt-3.5-turbo" | "gpt-4";
  context?: string;
  tokens?: Tokens;
  apiKey?: string;
  agentContext?: PreviousStepContext;
}

export type Parameter<T = Record<string, unknown>> = T;

export type Tools = "Google Calendar";

export type Tokens = {
  googleRefreshToken?: string;
  zoomRefreshToken?: string;
  microsoftRefreshToken?: string;
};

export type RequestMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "HEAD"
  | "DELETE"
  | "OPTIONS"
  | "TRACE"
  | "get"
  | "post"
  | "put"
  | "patch"
  | "head"
  | "delete"
  | "options"
  | "trace";

export interface ApiRequest {
  id?: string;
  method: RequestMethod;

  requestBody?: Record<string, any>;
  searchParams?: Record<string, any>;
  tool?: Tools;
  subTool: string;
  tokens: Tokens;
}

export type ResponseMapType = {
  [key: string]: (tool: "Google Calendar", subTool: string, response: Record<string, any>) => any;
};

export type RequestMapType = {
  [key: string]: (initialUrl: string, req: ApiRequest) => Promise<any>;
};

export type Classifications =
  | "INTERNAL INFORMATION RETRIEVAL"
  | "INFORMATION ANALYSIS"
  | "DOCUMENT INFORMATION EXTRACTION"
  | "OPERATIONS"
  | "USER INPUT"
  | "EXTERNAL INFORMATION RETRIEVAL";
