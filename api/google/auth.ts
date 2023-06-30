import axios from "axios";
import { oauth2_v2 } from "googleapis";

import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from "../../utils/constants";

export const refreshGoogleToken = async (refreshToken: string, apiKey: string) => {
  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    return await refreshGoogleTokenSelfHosted(refreshToken);
  }

  const res = await axios.get("https://api.llynx.ai/google/accessToken", {
    headers: {
      "x-api-key": apiKey,
    },
    params: {
      app: "google",
      refreshToken,
    },
  });
  return res.data as { access_token: string; refresh_token: string };
};

export const getUserInfo = async (refreshToken: string, apiKey: string) => {
  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    return await getUserInfoSelfHosted(refreshToken);
  }

  const res = await axios.get("https://api.llynx.ai/userinfo", {
    headers: {
      "x-api-key": apiKey,
    },
    params: {
      refreshToken,
    },
  });

  return res.data.userinfo as oauth2_v2.Schema$Userinfo;
};

export const refreshGoogleTokenSelfHosted = async (refreshToken: string) => {
  const res = await axios.post(
    "https://accounts.google.com/o/oauth2/token",
    {},
    {
      params: {
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      },
    }
  );
  return res.data as { access_token: string; refresh_token: string };
};

export const getUserInfoSelfHosted = async (refreshToken: string) => {
  const { access_token } = await refreshGoogleTokenSelfHosted(refreshToken);

  const res = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo", {
    params: {
      access_token,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
    },
  });

  return res.data as oauth2_v2.Schema$Userinfo;
};
