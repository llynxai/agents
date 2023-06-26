import { ScoredVector } from "@pinecone-database/pinecone";
import { calendar_v3 } from "googleapis";

export type ResponseTypes = {
  ["Google Calendar insert"]: calendar_v3.Schema$Event;
  ["Google Calendar update"]: calendar_v3.Schema$Event;
  ["Google Calendar get"]: calendar_v3.Schema$Event;
  ["Google Calendar list"]: calendar_v3.Schema$CalendarList;
  ["Google Calendar delete"]: Record<string, string>;
};

export type PreviousStepContext = {
  finalRequestBody: string;
  pineConeMatch?: ScoredVector;
  context: string;
};

export type FailedContext = {
  action: string;
  err: any;
  pineConeMatchResult?: ScoredVector;
  tool: string;
  modelOutput: string;
  finalRequestBody: Record<string, any>;
};

export type AgentResponse = {
  failure?: FailedContext;
  response?: PreviousStepContext;
};
