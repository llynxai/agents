import axios from "axios";

import { ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET } from "../../utils/constants";

export const refreshZoomToken = async (refreshToken: string) => {
  const base64 = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString("base64");

  const res = await axios.post("https://zoom.us/oauth/token", {
    headers: {
      Authorization: `Basic ${base64}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    params: {
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    },
  });

  return res.data as { access_token: string; refresh_token: string };
};
