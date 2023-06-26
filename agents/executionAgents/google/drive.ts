/* eslint-disable no-console */
import axios from "axios";
import { drive_v3 } from "googleapis";
import { LLMChain } from "langchain/chains";

import { refreshGoogleToken } from "../../../api/google/auth";
import { AgentResponse, PreviousStepContext } from "../../../api/types";
import { ApiRequest, Tokens } from "../../../types";
import { ApiAgent } from "../../baseAgents/apiAgent";
import { GoogleAgentOptions } from "./types";

/**
 * Agent Class For executing Google Drive Tasks
 */
export class GoogleDriveAgent extends ApiAgent {
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
${context} 
To search for a specific set of files or folders, use the query string q with files.list to filter the files to return.

This example shows the format of QUERY_STRING:

QUERY_TERM OPERATOR VALUES

Where:

query_term is the query term or field to search upon. To view the query terms that can be used to filter shared drives, refer to Search query terms.
operator specifies the condition for the query term. To view which operators you can use with each query term, refer to Query operators.
values are the specific values you want to use to filter your search results.

QUERY_TERM can be the following values: 
name,fullText,mimeType,modifiedTime,viewedByMeTime,trashed,starred,owners,writers,readers,sharedWithMe,createdTime,properties,appProperties,visibility,shortcutDetails.targetId

OPERATOR can be the following values:
contains, =, !=

Create QUERY_STRING from ACTION description. If ACTION is searching for files in a folder and FOUND_FILES has file names and ids. Use information in FOUND_FILES create QUERY_STRING using the FOUND_FILES.
      
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
      case "listFiles":
        return response.files as drive_v3.Schema$File[];
      default:
        return response as drive_v3.Schema$File;
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
      requestBody,
      method,
      searchParams = {},
      tokens: { googleRefreshToken: refreshToken },
      subTool,
    }: ApiRequest
  ) {
    const url = this.replaceIdWithValue(initialUrl, requestBody?.id);

    const { access_token } = await refreshGoogleToken(refreshToken);

    try {
      const res = await axios(url, {
        data:
          method === "POST" || method === "PUT" || method === "PATCH"
            ? { ...requestBody, id: undefined }
            : undefined,
        method,
        params: { ...searchParams, access_token },
      });

      return this.normalizeResponse(subTool, res.data);
    } catch (err) {
      console.log("Errror\n");
      console.error(JSON.stringify(err.response.data));
    }
  }

  /**
   * Execute agent
   * @returns
   */
  async run() {
    let modelOutput = "";
    let requestBody: Record<string, any> = {};

    const chain = new LLMChain({ llm: this.model, prompt: this.chatPrompt });

    try {
      let requestBodySchema = this.action.schemaSchema.replace(/\\/g, "");
      if (
        this.agentContext &&
        (this.action.schemaMethod === "PUT" ||
          this.action.schemaMethod === "PATCH" ||
          this.action.schemaMethod === "DELETE")
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
              id: body.id,
              method: this.action.schemaMethod,
              requestBody:
                this.action.schemaMethod === "PUT" ||
                this.action.schemaMethod === "PATCH" ||
                this.action.schemaMethod === "DELETE"
                  ? body
                  : undefined,
              searchParams: this.action.schemaMethod === "GET" ? { body } : undefined,
              subTool: this.action.schemaSubtool,
              tokens: this.tokens,
            })
          );
        }
        const responses = await Promise.all(requests);
        this.agentContext = {
          context: "",
          finalRequestBody: JSON.stringify(responses),
        } satisfies PreviousStepContext;
      } else {
        const response = await this.request(this.action.schemaEndpoint, {
          id: requestBody.id,
          method: this.action.schemaMethod,
          requestBody:
            this.action.schemaMethod === "PUT" ||
            this.action.schemaMethod === "PATCH" ||
            this.action.schemaMethod === "POST"
              ? requestBody
              : undefined,
          searchParams: this.action.schemaMethod === "GET" ? requestBody : undefined,
          subTool: this.action.schemaSubtool,
          tokens: this.tokens,
        });

        if (response instanceof Array) {
          this.agentContext = {
            context: `\n The action "${
              this.action.action
            }" resulted in these FOUND_FILES being: ${response
              .map((item) => {
                return `Name: ${item.name}, Id: ${item.id}, MimeType: ${item.mimeType}`;
              })
              .join("\n")}`,
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
      console.log(err);
      return {
        failure: {
          action: this.action.action,
          err,
          finalRequestBody: requestBody,
          modelOutput,
          tool: "Google Drive",
        },
      } satisfies AgentResponse;
    }
  }
}
