import { GmailAgent, GoogleCalendarAgent, GoogleDriveAgent } from "./google";
import { OutlookAgent } from "./microsoft";
import { ZoomMeetingAgent } from "./zoom";

/**
 * This maps agents to the tools matched from the Vector db.
 */
export const AgentNetWork = {
  Gmail: GmailAgent,
  "Google Calendar": GoogleCalendarAgent,
  "Google Drive": GoogleDriveAgent,
  "Microsoft Outlook": OutlookAgent,
  Zoom: ZoomMeetingAgent,
};
