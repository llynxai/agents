# Llynx Agents

LLynx agent is currently in alpha. The purpose of this repo is for the team to share some of the agents we have been building that work on top of LLynx. The repo will grow with time and we hope the community can use this as a guide to build their own agents that can plug into LLynx.

</br>

# How to Run

Agents are meant to be run in a backend Node environment. You can create a script to test them out after properly setting up the required dependencies.

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

We took inspiration from Langchain on how to create agents and some of the classes will look familiar to anyone who used Langchain before.

## Base Agents

Base agents are the foundation that every agent is built from. There are 3 types:

- [ActionAgent](/agents/baseAgents/documentation/ActionAgent.md)
- [ApiAgent](/agents/baseAgents/documentation/ApiAgent.md)
- [DelegatorAgent](/agents/baseAgents/documentation/DelegatorAgent.md)

</br>

## Execution Agents

Execution agents are the agents that actually execute an action. They are built off of the `Base Agents` mainly `ActionAgent` or `ApiAgent` and executed by the `DelegatorAgent`. You can check the agents we have already built in the [executionAgent folder](/agents/executionAgents)

</br>

# Tool Database

In addition to the LLynx API we utilize a tool database to match an Action to a specific API and schema. This database contains an extensible number of tools and these tools can be mapped to individual users. Our database of choice is Pinecone, but there are several others to choose from including Weaviate, Chroma, and more. 

</br>

# OAuth

For many APIs OAuth is required to authenticate users into their tools and for the application to be able to make requests on behalf of those users. We provide example OAuth documentation for `Google`, `Microsoft`, and `Zoom`.

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
