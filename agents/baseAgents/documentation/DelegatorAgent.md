# ApiAgent

The DelegatorAgent class manages the entire action plan. It maintains the context from one step to the other.

```ts
const agent = new DelegatorAgent({
  actions,
  tokens: {
    googleRefreshToken,
    microsoftRefreshToken,
    zoomRefreshToken,
  },
});

const { failedSteps, actions, finalResponse } = await agent.run();
```

</br>

## Properties

- `actions`: The actions that the agent will execute

  ```ts
  type AgentAction = {
    index: string;
    action: string;
    finalTool?: "Google Calendar" | "Zoom" | "Gmail";
    type: Classifications;
    schemaDescription?: string;
    schemaEndpoint?: string;
    schemaMethod?: RequestMethod;
    schemaSubtool?: string;
    schemaSchema?: string;
  }[];
  ```

- `agentContext`: If the agent is in the middle of a multistep action plan this context is used to give the agent context on what happened in the previous step.

  ```ts
  type PreviousStepContext = {
    finalRequestBody: string;
    pineConeMatch?: ScoredVector;
    context: string;
  };
  ```

- `tokens`: Oauth refresh tokens to pass to the api agent for authentication to make a request.
  ```ts
  type Tokens = {
    googleRefreshToken?: string;
    zoomRefreshToken?: string;
    microsoftRefreshToken?: string;
  };
  ```
- `context`: Any context you want to pass to the agent.
- `timeZone`: Optional but useful for agents that are time oriented.

## Methods

- `run`: Executes an action.

```ts
  async run(): Promise<{
    failedSteps: FailedContext[];
    actions: AgentAction[];
    finalResponse: Record<string, string | number | boolean>;
  }> {
    const failedSteps = [];
    const successFulSteps = {};
    for (const action of this.actions) {
      const isSupported = AgentNetWork[action.finalTool] !== undefined;
      if (action.type === "INFORMATION ANALYSIS") {
        const response = await this.askModel(action.description);
        this.context += `AI_RESPONSE is ${response}`;
      } else if (action.finalTool && isSupported) {
        const agent = new AgentNetWork[action.finalTool]({
          action,
          agentContext: this.agentContexts[action.finalTool],
          context: this.context,
          model: this.model,
          modelName: this.modelName,
          tokens: this.tokens,
        });

        const { response, failure } = await agent.run();

        if (response) {
          this.agentContexts[action.finalTool] = response;
          successFulSteps[action.description] = isValidJsonString(response.finalRequestBody)
            ? JSON.parse(response.finalRequestBody)
            : response.finalRequestBody;
          this.context += response.context;
        } else if (failure) {
          failedSteps.push(failure);
        }
      } else {
        console.log("Tool not supported yet");
      }
    }

    const finalResponse = isValidJson(successFulSteps[this.actions.at(-1).description])
      ? JSON.stringify(successFulSteps[this.actions.at(-1).description])
      : successFulSteps[this.actions.at(-1).description];
    return { actions: this.actions, failedSteps, finalResponse };
  }
```

- `askModel`: Some actions do not require an api request and the agent will instead ask the llm model execute the action.
