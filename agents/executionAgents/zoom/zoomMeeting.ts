/* eslint-disable no-console */
import axios from "axios";
import { LLMChain } from "langchain/chains";

import { AgentResponse } from "../../../api/types";
import { refreshZoomToken } from "../../../api/zoom/auth";
import { ApiRequest, Tokens } from "../../../types";
import { ApiAgent } from "../../baseAgents/apiAgent";
import { ZoomAgentOptions } from "./types";

/**
 * Agent Class For executing Zoom Meeting Tasks
 */
export class ZoomMeetingAgent extends ApiAgent {
  tokens: Tokens | undefined;

  constructor({
    action,
    agentContext,
    context = "",
    modelName = "gpt-3.5-turbo",
    tokens,
  }: ZoomAgentOptions) {
    super({ action, agentContext, context, modelName });
    this.tokens = tokens;
    this.context = context;
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
      searchParams = {},
      tokens: { zoomRefreshToken: refreshToken },
      subTool,
    }: ApiRequest
  ): Promise<Record<string, any> | undefined> {
    let url = initialUrl;
    if (id && (subTool === "update" || subTool === "get" || subTool === "delete")) {
      url += `/${id}`;

      searchParams.sendNotifications = json?.attendees?.length > 0 || subTool === "delete";
    }

    if (subTool === "insert" && !json?.summary) {
      json.summary = "Calendar invite created by AI Agent";
    }

    if (refreshToken) {
      const { access_token } = await refreshZoomToken(refreshToken);
      const res = await axios(url, {
        data: method === "POST" || method === "PUT" ? json : undefined,
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
        method,
        params: { ...searchParams },
      });

      return res.data;
    }
  }

  async run() {
    const chain = new LLMChain({ llm: this.model, prompt: this.chatPrompt });
    let requestBody: Record<string, any> = {};
    let modelOutput = "";

    try {
      let requestBodySchema = this.action.schema.replace(/\\/g, "");
      if (
        this.agentContext?.pineConeMatch.metadata["tool"] === this.action.final_tool &&
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

      const response = await this.request(this.action.schema_endpoint, {
        id: requestBody.id,
        method: this.action.schema_method,
        requestBody:
          this.action.schema_method === "PUT" || this.action.schema_method === "POST"
            ? requestBody
            : undefined,
        searchParams: this.action.schema_method === "GET" ? requestBody : undefined,
        subTool: this.action.schema_subtool,
        tokens: this.tokens,
      });

      const iconUri =
        "https://lh3.googleusercontent.com/pw/AM-JKLUkiyTEgH-6DiQP85RGtd_BORvAuFnS9katNMgwYQBJUTiDh12qtQxMJFWYH2Dj30hNsNUrr-kzKMl7jX-Qd0FR7JmVSx-Fhruf8xTPPI-wdsMYez6WJE7tz7KmqsORKBEnBTiILtMJXuMvphqKdB9X=s128-no";

      this.agentContext = {
        context: `The ZOOM MEETING has a meeting id of ${response.id}.
      The ZOOM MEETING meeting link is ${response.join_url}.
      The host of the ZOOM MEETING is ${response.host_email}. 
      The name of the ZOOM MEETING is Zoom meeting.
      The icon uri or url of the ZOOM MEETING is ${iconUri}
      The ZOOM MEETING is a video meeting.
      The ZOOM MEETING has been referenced.

      `,
        finalRequestBody: JSON.stringify({ ...requestBody, ...response }),
      };

      return { response: this.agentContext } satisfies AgentResponse;
    } catch (err) {
      return {
        failure: {
          action: this.action.action,
          err,
          finalRequestBody: requestBody,
          modelOutput,
          tool: "Zoom",
        },
      } satisfies AgentResponse;
    }
  }
}
