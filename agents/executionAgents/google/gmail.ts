/* eslint-disable no-console */
import axios from "axios";
import { calendar_v3 } from "googleapis";
import { LLMChain } from "langchain/chains";

import { getUserInfo, refreshGoogleToken } from "../../../api/google/auth";
import { AgentResponse, PreviousStepContext } from "../../../api/types";
import { Tokens } from "../../../types";
import { ApiAgent } from "../../baseAgents/apiAgent";
import { GmailApiRequest, GoogleAgentOptions } from "./types";

/**
 * Agent Class For executing Gmail tasks
 */
export class GmailAgent extends ApiAgent {
  tokens: Tokens;

  constructor({
    action,
    agentContext,
    context = "",
    modelName = "gpt-3.5-turbo",
    tokens,
  }: GoogleAgentOptions) {
    super({ action, agentContext, context, modelName });
    this.tokens = tokens;
    this.agentContext = agentContext;
    this.context = `
    If userId is not a property in REQUEST BODY then its value should be me.
    ${context}

    If an AI_RESPONSE exists as an email example:  
    Replace any template placholders, ie [Recipient], in AI_RESPONSE with information detailed in ACTION and convert AI_RESPONSE to html and use it in the body.
    
      
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

  transformReqeuest(
    subTool: string,
    from: string,
    to: string[],
    cc: string[],
    bcc: string[],
    requestBody: Record<string, any>
  ) {
    let messageParts: string[] = [];
    let message = "";
    let encodedMessage = "";
    let subject = "llynx ai sent this email.";
    switch (subTool) {
      case "sendMessage":
        subject = requestBody.subject ?? subject;
        messageParts = [
          `From: ${from}`,
          `To: ${to.join(",")}`,
          `Cc: ${cc.join(",")}`,
          `Bcc: ${bcc.join(",")}`,
          "Content-Type: text/html; charset=utf-8",
          "MIME-Version: 1.0",
          `Subject: ${subject}`,
          "",
          `${requestBody.body}`,
        ];

        message = messageParts.join("\n");

        encodedMessage = Buffer.from(message).toString("base64");

        return {
          raw: encodedMessage,
        };
      default:
        return requestBody;
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
      userId,
      to,
      from,
      cc = [],
      bcc = [],
      method,
      searchParams = {},
      tokens: { googleRefreshToken: refreshToken },
      subTool,
    }: GmailApiRequest
  ) {
    const url = this.replaceIdWithValue(initialUrl, userId);

    const { access_token } = await refreshGoogleToken(refreshToken);

    try {
      const res = await axios(url, {
        data:
          method === "POST" || method === "PUT"
            ? this.transformReqeuest(subTool, from, to, cc, bcc, json)
            : undefined,
        method,
        params: { ...searchParams, access_token },
      });

      return this.normalizeResponse(subTool, res.data);
    } catch (err) {
      console.error(JSON.stringify(err.response.data));
    }
  }

  async run() {
    let modelOutput = "";
    let requestBody: Record<string, any> = {};

    const authUser = await getUserInfo(this.tokens.googleRefreshToken);

    this.context += `Your Name is ${authUser.name}.`;

    const chain = new LLMChain({ llm: this.model, prompt: this.chatPrompt });

    try {
      let requestBodySchema = this.action.schemaSchema.replace(/\\/g, "");
      if (
        this.agentContext &&
        (this.action.schemaMethod === "PUT" || this.action.schemaMethod === "DELETE")
      ) {
        requestBodySchema = this.agentContext.finalRequestBody;
      }

      const res = await chain.call({
        action: this.action.action,
        context: this.context,
        requestBodySchema,
        service: this.action.finalTool,
      });

      modelOutput = res.text;
      requestBody = JSON.parse(res.text);

      if (requestBody instanceof Array) {
        const requests = [];
        for (const body of requestBody) {
          requests.push(
            this.request(this.action.schemaEndpoint, {
              bcc: body.bcc,
              cc: body.cc,
              from: authUser.email,
              method: this.action.schemaMethod,
              requestBody:
                this.action.schemaMethod === "PUT" || this.action.schemaMethod === "POST"
                  ? body
                  : undefined,
              searchParams: this.action.schemaMethod === "GET" ? { body } : undefined,
              subTool: this.action.schemaSubtool,
              to: body.to,
              tokens: this.tokens,
              userId: body.userId,
            })
          );
        }
        await Promise.all(requests);
        this.agentContext = {
          context: "",
          finalRequestBody: undefined,
        } satisfies PreviousStepContext;
      } else {
        const response = await this.request(this.action.schemaEndpoint, {
          bcc: requestBody.bcc,
          cc: requestBody.cc,
          from: authUser.email,
          method: this.action.schemaMethod,
          requestBody:
            this.action.schemaMethod === "PUT" || this.action.schemaMethod === "POST"
              ? requestBody
              : undefined,
          searchParams: this.action.schemaMethod === "GET" ? requestBody : undefined,
          subTool: this.action.schemaSubtool,
          to: requestBody.to,
          tokens: this.tokens,
          userId: requestBody.userId,
        });

        if (response instanceof Array) {
          this.agentContext = {
            context: "",
            finalRequestBody: JSON.stringify(response),
          } satisfies PreviousStepContext;
        } else {
          this.agentContext = {
            context: "",
            finalRequestBody: JSON.stringify({ ...requestBody, ...response }),
          } satisfies PreviousStepContext;
        }
      }

      return { response: this.agentContext } satisfies AgentResponse;
    } catch (err) {
      return {
        failure: {
          action: this.action.action,
          err,
          finalRequestBody: requestBody,
          modelOutput,
          tool: "Gmail",
        },
      } satisfies AgentResponse;
    }
  }
}
