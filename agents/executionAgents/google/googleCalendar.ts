/* eslint-disable no-console */
import axios from "axios";
import { calendar_v3 } from "googleapis";
import isValidEmail from "is-valid-email";
import { LLMChain } from "langchain/chains";
import { v4 } from "uuid";

import { refreshGoogleToken } from "../../../api/google/auth";
import { AgentResponse } from "../../../api/types";
import { ApiRequest, Tokens } from "../../../types";
import { ApiAgent } from "../../baseAgents/apiAgent";
import { GoogleAgentOptions } from "./types";

/**
 * Agent Class For executing Google Calendar Tasks
 */
export class GoogleCalendarAgent extends ApiAgent {
  tokens: Tokens;
  apiKey: string;

  constructor({
    action,
    agentContext,
    context = "",
    modelName = "gpt-3.5-turbo",
    tokens,
    apiKey,
  }: GoogleAgentOptions) {
    super({ action, agentContext, context, modelName });
    this.tokens = tokens;
    this.apiKey = apiKey;
    const requestId = v4();
    this.agentContext = agentContext;
    this.context = `
    The ZOOM MEETING has not been referenced.
    ${context}
        
    If The ZOOM MEETING has not been referenced do not set CONFERENCE_DATA to anything and do not add CONFERENCE_DATA to REQUEST BODY.

    If The ZOOM MEETING has been referenced then set CONFERENCE_DATA to a JSON string with the following schema {"conferenceData": { "conferenceSolution": { "key": { "type": "addOn" }, "name": "Zoom Meeting", "iconUri": ""}, "entryPoints": [{ "entryPointType": "video", "uri":""}]}}

    If The ZOOM MEETING has been referenced, update CONFERENCE_DATA fields based on the information provided by The ZOOM MEETING. Do not add the signature field to CONFERENCE DATA. Then add CONFERENCE DATA to REQUEST BODY. Make sure REQUEST BODY is a valid JSON string when you add CONFERENCE DATA to it.  


    If ACTION wants to add Google Meet to the calendar MEET DATA is a JSON string with the following schema "conferenceData": {"createRequest": {"requestId": ${requestId}}}. Update MEET DATA properties based ACTION and then add MEET DATA to REQUEST BODY. 
    If ACTION does not want to add Google Meet to the calendar then do not add MEET DATA to REQUEST BODY.
      
    `;
  }

  /**
   * Normalize response from api
   * @param subTool
   * @param response
   * @returns single google calendar event or an array of google calendar events
   */
  normalizeResponse(subTool: string, response: Record<string, any>) {
    switch (subTool) {
      case "list":
        return response.items as calendar_v3.Schema$Event[];
      default:
        return response as calendar_v3.Schema$Event;
    }
  }

  /**
   *
   * @param initialUrl
   * @param param1
   * @returns raw google calendar response
   */
  async request(
    initialUrl: string,
    {
      requestBody: json,
      id,
      method,
      searchParams = { conferenceDataVersion: 1 },
      tokens: { googleRefreshToken: refreshToken },
      subTool,
    }: ApiRequest
  ) {
    let url = initialUrl;
    if (id && (subTool === "update" || subTool === "get" || subTool === "delete")) {
      url += `/${id}`;

      searchParams.sendNotifications = json?.attendees?.length > 0 || subTool === "delete";
    }
    const hasAddonConference = json && json.conferenceData?.entryPoints?.every((item) => item.uri);
    const hasMeet = json && json.conferenceData?.createRequest?.requestId !== undefined;

    if (json?.attendees) {
      json.attendees = json.attendees?.filter((item) => isValidEmail(item.email));
    }

    if (json && !hasAddonConference && !hasMeet) {
      json.conferenceData = undefined;
    }

    if (subTool === "insert" && !json.summary) {
      json.summary = "Calendar invite created by AI Agent";
    }

    const { access_token } = await refreshGoogleToken(refreshToken, this.apiKey);
    const res = await axios(url, {
      data: method === "POST" || method === "PUT" ? json : undefined,
      method,
      params: { ...searchParams, access_token },
    });

    return this.normalizeResponse(subTool, res.data);
  }

  /**
   *
   * @returns
   */
  async run() {
    const chain = new LLMChain({ llm: this.model, prompt: this.chatPrompt });
    let requestBody: Record<string, any> = {};
    let modelOutput = "";

    try {
      let requestBodySchema = this.action.schema.replace(/\\/g, "");
      if (
        this.agentContext &&
        (this.action.schema_method === "PUT" || this.action.schema_method === "DELETE")
      ) {
        requestBodySchema = this.agentContext.finalRequestBody;
      }

      const res = await chain.call({
        action: this.action.action,
        context: this.context,
        requestBodySchema,
        service: this.action.final_tool,
      });

      modelOutput = res.text;
      requestBody = JSON.parse(res.text);

      if (requestBody instanceof Array) {
        const requests = [];
        for (const body of requestBody) {
          requests.push(
            this.request(this.action.schema_endpoint, {
              id: body.id,
              method: this.action.schema_method,
              requestBody:
                this.action.schema_method === "PUT" || this.action.schema_method === "POST"
                  ? body
                  : undefined,
              searchParams:
                this.action.schema_method === "GET" ? { body } : { conferenceDataVersion: 1 },
              subTool: this.action.schema_subtool,
              tokens: this.tokens,
            })
          );
        }
        const responses = await Promise.all(requests);
        this.agentContext = {
          context: "",
          finalRequestBody: JSON.stringify(responses),
        };
      } else {
        const response = await this.request(this.action.schema_endpoint, {
          id: requestBody.id,
          method: this.action.schema_method,
          requestBody:
            this.action.schema_method === "PUT" || this.action.schema_method === "POST"
              ? requestBody
              : undefined,
          searchParams:
            this.action.schema_method === "GET" ? requestBody : { conferenceDataVersion: 1 },
          subTool: this.action.schema_subtool,
          tokens: this.tokens,
        });

        if (response instanceof Array) {
          this.agentContext = {
            context: "",
            finalRequestBody: JSON.stringify(response),
          };
        } else {
          this.agentContext = {
            context: `The calendar event start time is ${response.start.dateTime} and the end time is ${response.start.dateTime}.`,
            finalRequestBody: JSON.stringify({ ...requestBody, ...response }),
          };
        }
      }

      return { response: this.agentContext } satisfies AgentResponse;
    } catch (err) {
      console.log(err);
      return {
        failure: {
          action: this.action.action,
          err: { body: err.body, message: err.message, statusCode: err.statusCode, url: err.url },
          finalRequestBody: requestBody,
          modelOutput,
          tool: "Google Calendar",
        },
      } satisfies AgentResponse;
    }
  }
}
