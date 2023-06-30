# LLynx Agents

LLynx agent is currently in alpha. The purpose of this repo is for the team to share some of the agents we have been building that work on top of [LLynx api](https://docs.llynx.ai). The repo will grow with time and we hope the community can use this as a guide to build their own agents that can plug into LLynx.

</br>

# Initial Setup

Agents are meant to be run in a backend Node environment. You can create a script to test them out after properly setting up the required dependencies.

</br>

### Setup OAuth access with Agent for Google Calendar

1. [Go to Google Cloud Console and setup a project](https://console.cloud.google.com/welcome)
2. [Enabled Google Calendar API](https://support.google.com/googleapi/answer/6158841?hl=en)
3. [Create OAuth 2.0 credential](https://developers.google.com/workspace/guides/create-credentials)
4. Store the `Client Id` and `Client Secret` some where secure.

</br>

### Tokens

Once you have OAuth setup, you will need to generate a refreshToken that can be enable by the agent to do things on your behalf.
This [server side example](https://cloud.google.com/nodejs/docs/reference/google-auth-library/latest) is one way to do this without having to build an entire frontend.

`NOTE: What you want to store is the refresh token not the access token.`

</br>
</br>

### OpenAI API key

You will also need to generate an OpenAI API key.

1. Go to OpenAI's Platform website at platform.openai.com and sign in with an OpenAI account.
2. Click your profile icon at the top-right corner of the page and select "View API Keys."
3. Click "Create New Secret Key" to generate a new API key.

</br>
</br>

# Quick Start Guide

1. Run the following commands in the terminal to get started.

   ```bash
   mkdir quickstart
   cd quickstart
   touch package.json
   ```

</br>

2. Go to the quickstart folder, open the package.json file, and add this snippet to it and save.

   ```json
   {
     "name": "llynx-quickstart",
     "version": "0.0.0",
     "type": "module",
     "private": true,
     "scripts": {},
     "devDependencies": {
       "@types/node": "^20.3.2"
     },
     "dependencies": {
       "@llynxai/agents": "^0.1.6",
       "axios": "1.4.0"
     }
   }
   ```

3. Run the following command in the quickstart folder to install the packages.

   ```bash
   yarn install
   ```

   or

   ```bash
   npm install
   ```

4. In the terminal run the following command.

   ```bash
     touch agent-script.js
   ```

5. Open `agent-script.js`, paste the snippet below in it, and save the file.

   ```js
   import { DelegatorAgent } from "@llynxai/agents";
   import axios from "axios";
   import fs from "fs/promises";

   const main = async () => {
     // Call the llynx api to get an action plan
     const res = await axios.post(
       "https://api.llynx.ai/actions/quickstart",
       { query: "Schedule a meeting with Ed tomorrow at noon." },
       {
         headers: {
           "x-api-key": "YOUR_LLYNX_API_KEY",
         },
       }
     );

     // get your refresh tokens
     const tokenRes = await axios.get("https://api.llynx.ai/tokens", {
       headers: {
         "x-api-key": "YOUR_LLYNX_API_KEY",
       },
     });

     const googleRefreshToken = tokenRes.data.tokens.googleRefreshToken;

     // Execute action plan using the DelegatorAgent
     const agent = new DelegatorAgent({
       actions: res.data.actions,
       tokens: {
         googleRefreshToken,
       },
     });

     // Check the outputs after the run is complete
     const { failedSteps, actions, finalResponse } = await agent.run();
     await fs.writeFile("./output.json", JSON.stringify({ failedSteps, actions, finalResponse }));
   };

   // run main function
   main();
   ```

6. Before running the script make sure you have Open ai environment variable set.

   ```js
   OPENAI_API_KEY;
   ```

   You can set it quickly by running this command in the terminal.

   ```bash
   export OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
   ```

7. Run the script and check the results in your calendar

   ```bash
   node agent-script.js
   ```

   </br>
   </br>

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

For many APIs OAuth is required to authenticate users into their tools and for the application to be able to make requests on behalf of those users. You can check the OAuth documentation for [Google](https://developers.google.com/identity/protocols/oauth2), [Microsoft](https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow), and [Zoom](https://developers.zoom.us/docs/integrations/oauth/) to setup your own up.

</br>

# Environment Variables

The following environment variables would need to be set if you plan to use these agents out of the box.

```js
GOOGLE_CLIENT_ID;
GOOGLE_CLIENT_SECRET;
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
