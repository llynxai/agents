/* eslint-disable no-console */
import { Event } from "@microsoft/microsoft-graph-types";
import axios from "axios";
import { LLMChain } from "langchain/chains";
import { v4 } from "uuid";

import { refreshMicrosoftToken } from "../../../api/microsoft/auth";
import { AgentResponse } from "../../../api/types";
import { ApiRequest, Tokens } from "../../../types";
import { ApiAgent } from "../../baseAgents/apiAgent";
import { OutlookCalAgentOptions } from "./types";

/**
 * Agent Class For executing Outlook Calendar Tasks
 */
export class OutlookAgent extends ApiAgent {
  tokens: Tokens;
  transactionId: string;

  constructor({
    action,
    agentContext,
    context = "",
    modelName = "gpt-3.5-turbo",
    tokens,
  }: OutlookCalAgentOptions) {
    super({ action, agentContext, context, modelName });
    this.tokens = tokens;
    // const requestId = v4();
    this.transactionId = v4();
    this.agentContext = agentContext;
    this.context = `
    ${context}

    RECURRING_EVENT is this json string 
    {
      "recurrence": {
        "pattern":RECURRENCY_PATTERN,
        "range": RECURRENCY_RANGE
      }
    }

    RECURRENCY_PATTERN is represented by a json string that can have the following properties represented as property - property description:
      dayOfMonth - The day of the month on which the event occurs. Required if type is absoluteMonthly or absoluteYearly.

      daysOfWeek - A collection of the days of the week on which the event occurs. The possible values are: sunday, monday, tuesday, wednesday, thursday, friday, saturday.
      If type is relativeMonthly or relativeYearly, and daysOfWeek specifies more than one day, the event falls on the first day that satisfies the pattern.
      Required if type is weekly, relativeMonthly, or relativeYearly.

      firstDayOfWeek - 	The first day of the week. The possible values are: sunday, monday, tuesday, wednesday, thursday, friday, saturday. Default is sunday. Required if type is weekly.

      index - Specifies on which instance of the allowed days specified in daysOfWeek the event occurs, counted from the first instance in the month. The possible values are: first, second, third, fourth, last. Default is first. Optional and used if type is relativeMonthly or relativeYearly.

      interval - The number of units between occurrences, where units can be in days, weeks, months, or years, depending on the type. Required.

      month - The month in which the event occurs. This is a number from 1 to 12.

      type - The recurrence pattern type: daily, weekly, absoluteMonthly, relativeMonthly, absoluteYearly, relativeYearly. Required
    
    RECURRENCY_RANGE is represented by a json string that can have the following properties represented as property - property description:
      endDate - The date to stop applying the recurrence pattern. Depending on the recurrence pattern of the event, the last occurrence of the meeting may not be this date. Required if type is endDate.

      numberOfOccurrences - The number of times to repeat the event. Required and must be positive if type is numbered.

      recurrenceTimeZone - Time zone for the startDate and endDate properties. Optional. If not specified, the time zone of the event is used.

      startDate - The date to start applying the recurrence pattern. The first occurrence of the meeting may be this date or later, depending on the recurrence pattern of the event. Must be the same value as the start property of the recurring event. Required.

      type - The recurrence range. The possible values are: endDate, noEnd, numbered. Required.

    If ACTION is saying to create or update a recurring event, use the information provided in ACTION to update RECURRING_EVENT. Once RECURRING_EVENT is updated add it to REQUEST BODY. If ACTION also wants to update the time then update start->dateTime in REQUEST BODY to the time ACTION says.
    If ACTION does not say that the event or calendar invite it is recurring, do not add RECURRING_EVENT to REQUEST BODY.
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
      case "listEvents":
        return response.value as Event[];
      default:
        return response as Event;
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
      searchParams,
      tokens: { microsoftRefreshToken: refreshToken },
      subTool,
    }: ApiRequest
  ) {
    const url = this.replaceIdWithValue(initialUrl, id);

    if (subTool === "updateEvent" && json && !json?.subject) {
      json.subject = "Calendar invite created by AI Agent";
    }

    if (subTool === "createEvent" && json && !json.subject) {
      json.subject = this.action.action;
    }

    if (json && !json.body) {
      json.body = { content: json.subject, contentType: "HTML" };
    }

    const { access_token } = await refreshMicrosoftToken(refreshToken);
    console.log("url", url);

    const res = await axios(url, {
      data:
        method === "POST" || method === "PUT" || method === "PATCH"
          ? { ...json, transactionId: method === "POST" ? this.transactionId : undefined }
          : undefined,
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
      method,
      params: searchParams,
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
                this.action.schemaMethod === "POST"
                  ? body
                  : undefined,
              searchParams:
                this.action.schemaMethod === "GET" ? { body } : { conferenceDataVersion: 1 },
              subTool: this.action.schemaSubtool,
              tokens: this.tokens,
            })
          );
        }
        await Promise.all(requests);
        this.agentContext = {
          context: "",
          finalRequestBody: undefined,
        };
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
            context: "",
            finalRequestBody: JSON.stringify(response),
          };
        } else {
          this.agentContext = {
            context: `The calendar event start time is ${response.start.dateTime} and the end time is ${response.start.dateTime}.`,
            finalRequestBody: JSON.stringify({ ...requestBody, id: response.id }),
          };
        }
      }

      return { response: this.agentContext } satisfies AgentResponse;
    } catch (err) {
      console.log("Error messages");
      console.log(err.response?.data ?? err.message);
      return {
        failure: {
          action: this.action.action,
          err: {
            message: err.message,
            statusCode: err.statusCode,
            url: err.url,
          },
          finalRequestBody: requestBody,
          modelOutput,
          tool: "Google Calendar",
        },
      } satisfies AgentResponse;
    }
  }
}
