import axios from "axios";
import { oauth2_v2 } from "googleapis";

export const refreshGoogleToken = async (refreshToken: string, apiKey: string) => {
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
