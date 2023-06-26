import axios from "axios";
import { oauth2_v2 } from "googleapis";

import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from "../../utils/constants";

export const refreshGoogleToken = async (refreshToken: string) => {
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

export const getUserInfo = async (refreshToken: string) => {
  const { access_token } = await refreshGoogleToken(refreshToken);

  const res = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo", {
    params: {
      access_token,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
    },
  });

  return res.data as oauth2_v2.Schema$Userinfo;
};
