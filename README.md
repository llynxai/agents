# Llynx Agents

Llynx agent is currently in alpha. The purpose of this repo is for the team to share some of the agents we have been building. The repo will grow with time and we hope the community can use this as a guide to build their own agents that can plug into Llynx.

</br>

# How to Run

Agents are meant to be ran in a backend Node environment. you can create a simple script to test it out after properly setting up the dependencies.

```ts
const agent = new DelegatorAgent({
  actions: body.action as any,
  tokens: {
    googleRefreshToken,
    microsoftRefreshToken,
    zoomRefreshToken,
  },
});

const { failedSteps, actions, finalResponse } = await agent.run();
```

# Agent Types

We took a lot of inspiration from Langchain on how we create agents and some of classes will look familiar to anyone who used Langchain before.

## Base Agents

Base agents are the foundation that every agent is built from. There are 3 types:

- [ActionAgent](/agents/baseAgents/documentation/ActionAgent.md)
- [ApiAgent](/agents/baseAgents/documentation/ApiAgent.md)
- [DelegatorAgent](/agents/baseAgents/documentation/DelegatorAgent.md)

</br>

## Execution Agents

Execution agents are the agents that actually execute an action. They are built off of the `Base Agents` mainly `ActionAgent` or `ApiAgent` and executed by the `DelegatorAgent`. You can check the agents we have already built in the [executionAgent folder](/agents/executionAgents)

</br>

# Vector DB

In addition to the Llynx api we utilize Pinecone for our vector database. This allows us to match an Action to a specific api and schema. In the future we may return our matching in the Llynx api itself but for the time being a seperate db will need to be created or you can use an alternative to determining how you want to select which api to use based on what the api returns. Our vector database of choice is Pinecone.

</br>

# Oauth

For a lot of APIs oauth is needed to be able to make requests on behalf of the users. To use the currently built agents you will need to enable Oauth for `Google`, `Microsoft`, and `Zoom`.

</br>

# Environment Variables

The following environment variables would need to be set if you plan to use these agents out of the box.

```js
GOOGLE_CLIENT_ID;
GOOGLE_CLIENT_SECRET;
PINECONE_API_KEY;
PINECONE_INDEX;
PINECONE_ENVIRONMENT;
ZOOM_CLIENT_SECRET;
ZOOM_CLIENT_ID;
MICROSOFT_CLIENT_ID;
MICROSOFT_CLIENT_SECRET;
OPENAI_API_KEY;
```

</br>

# Credits

- [LangChain JS](https://js.langchain.com/docs/getting-started/guide-llm)
- [OpenAi](https://github.com/openai/openai-node)
