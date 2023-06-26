import axios from "axios";
import { MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET } from "../../utils/constants";

export const refreshMicrosoftToken = async (refreshToken: string) => {
  const res = await axios.post(
    "https://login.microsoftonline.com/consumers/oauth2/v2.0/token",
    {
      client_id: MICROSOFT_CLIENT_ID,
      client_secret: MICROSOFT_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    },
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return res.data as { access_token: string; refresh_token: string };
};
