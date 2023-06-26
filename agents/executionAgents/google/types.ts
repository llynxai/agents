import { AgentOptions, ApiRequest } from "../../../types";

export interface GoogleAgentOptions extends AgentOptions {
  timeZone?: string;
}

export interface GmailApiRequest extends ApiRequest {
  userId: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  from: string;
}
