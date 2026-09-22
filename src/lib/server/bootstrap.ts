// Server-only. Creates this app's Drive folder and Google Sheet (three
// tabs, header rows, moved into the folder) the first time someone connects
// Google via /api/auth/google — see that route. Column order here must
// match sheets.ts exactly, since that's the header-row contract.
import "server-only";
import { google } from "googleapis";

const SETS_HEADER = ["session_id", "date", "exercise", "implement", "set_index", "weight_lb", "reps", "rpe", "note", "brutal"];
const SESSIONS_HEADER = [
  "session_id", "date", "block_id", "week", "dow", "type", "name", "status",
  "sleep", "soreness", "joint_flag", "note", "rpe", "avg_hr", "distance_mi",
];
const BODY_HEADER = ["date", "bodyweight_lb", "waist_in", "chest_in", "arm_in", "thigh_in"];

export interface BootstrapResult {
  folderId: string;
  spreadsheetId: string;
}

export async function bootstrapWorkspace(
  auth: InstanceType<typeof google.auth.OAuth2>,
  folderName = "Training Log",
  sheetName = "Training Log"
): Promise<BootstrapResult> {
  const drive = google.drive({ version: "v3", auth });
  const sheets = google.sheets({ version: "v4", auth });

  const folderRes = await drive.files.create({
    requestBody: { name: folderName, mimeType: "application/vnd.google-apps.folder" },
    fields: "id",
  });
  const folderId = folderRes.data.id;
  if (!folderId) throw new Error("Drive did not return a folder id.");

  const sheetRes = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: sheetName },
      sheets: [{ properties: { title: "sets" } }, { properties: { title: "sessions" } }, { properties: { title: "body" } }],
    },
    fields: "spreadsheetId",
  });
  const spreadsheetId = sheetRes.data.spreadsheetId;
  if (!spreadsheetId) throw new Error("Sheets did not return a spreadsheet id.");

  await Promise.all([
    sheets.spreadsheets.values.update({ spreadsheetId, range: "sets!A1", valueInputOption: "RAW", requestBody: { values: [SETS_HEADER] } }),
    sheets.spreadsheets.values.update({ spreadsheetId, range: "sessions!A1", valueInputOption: "RAW", requestBody: { values: [SESSIONS_HEADER] } }),
    sheets.spreadsheets.values.update({ spreadsheetId, range: "body!A1", valueInputOption: "RAW", requestBody: { values: [BODY_HEADER] } }),
  ]);

  const fileRes = await drive.files.get({ fileId: spreadsheetId, fields: "parents" });
  const previousParents = (fileRes.data.parents ?? []).join(",");
  await drive.files.update({ fileId: spreadsheetId, addParents: folderId, removeParents: previousParents, fields: "id, parents" });

  return { folderId, spreadsheetId };
}
