// ==============================================================================
// MEDIHIVE SUPABASE EDGE FUNCTION: google-sync
// Asynchronous background synchronization to Google Drive and Google Sheets
// ==============================================================================
// Deno TypeScript Runtime
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_API_URL = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD_URL =
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
const SHEETS_API_URL = "https://sheets.googleapis.com/v4/spreadsheets";

function getSupabaseAdmin() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment",
    );
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

// Ensure access token is valid, refreshing it if expired
async function getValidAccessToken(supabaseAdmin: any): Promise<string> {
  const { data: auth, error } = await supabaseAdmin
    .from("google_sync_auth")
    .select("refresh_token, access_token, expires_at")
    .eq("id", 1)
    .maybeSingle();

  if (error || !auth || !auth.refresh_token) {
    throw new Error(
      "Doctor has not authorized Google account yet. Please connect Google in Settings.",
    );
  }

  // Check if current access token is still valid (with 2 min buffer)
  const now = Date.now();
  if (auth.access_token && auth.expires_at && auth.expires_at > now + 120000) {
    return auth.access_token;
  }

  // Refresh token with Google
  const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID") || "";
  const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET") || "";

  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_OAUTH_CLIENT_ID or GOOGLE_OAUTH_CLIENT_SECRET is missing.",
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: auth.refresh_token,
    grant_type: "refresh_token",
  });

  const res = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const tokenData = await res.json();
  if (!res.ok || tokenData.error) {
    throw new Error(
      `Google token refresh failed: ${tokenData.error_description || tokenData.error}`,
    );
  }

  const newAccessToken = tokenData.access_token;
  const newExpiresAt = now + (Number(tokenData.expires_in) || 3600) * 1000;

  await supabaseAdmin
    .from("google_sync_auth")
    .update({
      access_token: newAccessToken,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  return newAccessToken;
}

// Find existing Drive subfolder or create it
async function getOrCreateDriveFolder(
  accessToken: string,
  folderName: string,
  parentId?: string,
): Promise<string> {
  let query = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }

  const searchUrl = `${DRIVE_API_URL}?q=${encodeURIComponent(query)}&fields=files(id,name)`;
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  // Create folder
  const metadata: any = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentId) {
    metadata.parents = [parentId];
  }

  const createRes = await fetch(DRIVE_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(metadata),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(
      `Failed to create Google Drive folder '${folderName}': ${errText}`,
    );
  }

  const created = await createRes.json();
  return created.id;
}

// Upload a single Base64 image to Google Drive folder
async function uploadBase64ImageToDrive(
  accessToken: string,
  base64DataUrl: string,
  fileName: string,
  parentFolderId: string,
): Promise<{ fileId: string; webViewLink: string }> {
  // Extract MIME type and raw base64
  const matches = base64DataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  let mimeType = "image/jpeg";
  let base64String = base64DataUrl;

  if (matches && matches.length === 3) {
    mimeType = matches[1];
    base64String = matches[2];
  }

  // Decode binary data
  const binaryStr = atob(base64String);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  const metadata = {
    name: fileName,
    parents: [parentFolderId],
  };

  const boundary = "-------314159265358979323846";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metaPart = `Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
  const mediaHeader = `Content-Type: ${mimeType}\r\n\r\n`;

  // Construct multipart body
  const textEncoder = new TextEncoder();
  const metaBytes = textEncoder.encode(
    `${delimiter}${metaPart}${delimiter}${mediaHeader}`,
  );
  const closeBytes = textEncoder.encode(closeDelimiter);

  const fullPayload = new Uint8Array(
    metaBytes.length + bytes.length + closeBytes.length,
  );
  fullPayload.set(metaBytes, 0);
  fullPayload.set(bytes, metaBytes.length);
  fullPayload.set(closeBytes, metaBytes.length + bytes.length);

  const uploadRes = await fetch(
    `${DRIVE_UPLOAD_URL}&fields=id,name,webViewLink,webContentLink`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
        "Content-Length": fullPayload.length.toString(),
      },
      body: fullPayload,
    },
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(
      `Google Drive image upload failed for '${fileName}': ${errText}`,
    );
  }

  const fileData = await uploadRes.json();
  const fileId = fileData.id;
  let webViewLink =
    fileData.webViewLink ||
    `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;

  // Make the file readable with link
  try {
    await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: "reader", type: "anyone" }),
      },
    );
  } catch {
    // Non-critical if domain permissions restrict public links
  }

  return { fileId, webViewLink };
}

// Synchronize OPD Record & Images to Google Drive & Google Sheet
async function syncSingleOpdRecord(supabaseAdmin: any, opdId: string) {
  // 1. Fetch OPD record & patient
  const { data: opd, error: opdErr } = await supabaseAdmin
    .from("opd_records")
    .select("*")
    .eq("id", opdId)
    .single();

  if (opdErr || !opd) {
    throw new Error(
      `OPD record ${opdId} not found in database: ${opdErr?.message}`,
    );
  }

  const { data: patient } = await supabaseAdmin
    .from("patients")
    .select("*")
    .eq("id", opd.patient_id)
    .single();

  // 2. Fetch config
  const { data: config } = await supabaseAdmin
    .from("google_sync_config")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  const sheetId = config?.sheet_id || Deno.env.get("GOOGLE_SHEET_ID");
  const driveRootFolderId =
    config?.drive_root_folder_id || Deno.env.get("GOOGLE_DRIVE_ROOT_FOLDER_ID");

  // Mark record status as 'syncing'
  await supabaseAdmin.from("google_sync_records").upsert({
    opd_id: opdId,
    patient_id: opd.patient_id,
    status: "syncing",
    updated_at: new Date().toISOString(),
  });

  const accessToken = await getValidAccessToken(supabaseAdmin);
  const driveLinks: string[] = [];
  let driveFolderId: string | null = null;

  // 3. GOOGLE DRIVE SYNC (Upload clinical images)
  const images = Array.isArray(opd.uploaded_images) ? opd.uploaded_images : [];
  if (images.length > 0 && driveRootFolderId) {
    // Determine Year, Month and OPD Folder:
    // MediHive Images / <Year> / <Month> / <OPD-ID> /
    const visitDate = new Date(opd.visit_date || Date.now());
    const yearStr = visitDate.getFullYear().toString();
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const monthStr = monthNames[visitDate.getMonth()] || "General";

    // 3a. Resolve Year folder
    const yearFolderId = await getOrCreateDriveFolder(
      accessToken,
      yearStr,
      driveRootFolderId,
    );

    // 3b. Resolve Month folder
    const monthFolderId = await getOrCreateDriveFolder(
      accessToken,
      monthStr,
      yearFolderId,
    );

    // 3c. Resolve OPD ID folder
    const opdFolderId = await getOrCreateDriveFolder(
      accessToken,
      opd.id,
      monthFolderId,
    );
    driveFolderId = opdFolderId;

    // 3d. Upload each image with duplicate protection
    for (let i = 0; i < images.length; i++) {
      const imgDataUrl = images[i];
      if (!imgDataUrl || typeof imgDataUrl !== "string") continue;

      // Check if already uploaded in google_sync_files
      const { data: existingFile } = await supabaseAdmin
        .from("google_sync_files")
        .select("drive_file_id, drive_web_link")
        .eq("opd_id", opd.id)
        .eq("image_index", i)
        .maybeSingle();

      if (existingFile && existingFile.drive_web_link) {
        driveLinks.push(existingFile.drive_web_link);
        continue;
      }

      const fileName = `clinical_photo_${opd.id}_${i + 1}.jpg`;
      const uploaded = await uploadBase64ImageToDrive(
        accessToken,
        imgDataUrl,
        fileName,
        opdFolderId,
      );
      driveLinks.push(uploaded.webViewLink);

      // Record in google_sync_files
      await supabaseAdmin.from("google_sync_files").upsert({
        opd_id: opd.id,
        image_index: i,
        drive_file_id: uploaded.fileId,
        drive_web_link: uploaded.webViewLink,
        file_name: fileName,
        uploaded_at: new Date().toISOString(),
      });
    }
  }

  // 4. GOOGLE SHEETS SYNC (Append or Update row)
  let sheetRowIndex: number | null = null;
  if (sheetId) {
    const sheetName = "MediHive - Patient Records";

    // 4a. Check existing rows to prevent duplicates (search OPD ID in Column A)
    const readUrl = `${SHEETS_API_URL}/${sheetId}/values/${encodeURIComponent(sheetName)}!A:A`;
    const readRes = await fetch(readUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    let existingRows: any[][] = [];
    if (readRes.ok) {
      const readData = await readRes.json();
      existingRows = readData.values || [];
    }

    // 4b. If sheet is brand new/empty, write header row first
    if (existingRows.length === 0) {
      const headers = [
        "OPD ID",
        "Patient ID",
        "Patient Name",
        "Age",
        "Gender",
        "Mobile",
        "Visit Date",
        "Diagnosis",
        "Symptoms",
        "Complaint",
        "Consultation Fee (₹)",
        "Medicine Fee (₹)",
        "Panchakarma Fee (₹)",
        "Total Fee (₹)",
        "Payment Mode",
        "Payment Status",
        "Medicines Prescribed",
        "Clinical Notes",
        "Panchakarma Notes",
        "Next Visit Date",
        "Google Drive Image Link",
        "Synced At",
      ];
      await fetch(
        `${SHEETS_API_URL}/${sheetId}/values/${encodeURIComponent(sheetName)}!A1:V1?valueInputOption=USER_ENTERED`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            range: `${sheetName}!A1:V1`,
            values: [headers],
          }),
        },
      );
      existingRows = [headers];
    }

    // Find row index where Column A matches this OPD ID
    let foundRowIndex = -1;
    for (let r = 0; r < existingRows.length; r++) {
      if (existingRows[r] && existingRows[r][0] === opd.id) {
        foundRowIndex = r + 1; // 1-based row index for Google Sheets
        break;
      }
    }

    // Format medicine list
    const medicinesStr = Array.isArray(opd.medicines)
      ? opd.medicines
          .map(
            (m: any) =>
              `${m.name || ""} (${m.dosage || ""}, ${m.frequency || ""}, ${m.timing || ""})`,
          )
          .join("; ")
      : "";

    const symptomsStr = Array.isArray(opd.symptoms)
      ? opd.symptoms.join(", ")
      : "";
    const driveLinkStr = driveLinks.join(" , ");

    const rowData = [
      opd.id,
      patient?.id || opd.patient_id,
      patient?.full_name || "Patient",
      patient?.age || "",
      patient?.gender || "",
      patient?.mobile || "",
      opd.visit_date || "",
      opd.diagnosis || "General Consultation",
      symptomsStr,
      opd.complaint || "",
      Number(opd.consultation_fee) || 0,
      Number(opd.medicine_fee) || 0,
      Number(opd.panchakarma_fee) || 0,
      Number(opd.total_fee) || 0,
      opd.payment_mode || "Cash",
      opd.payment_status || "Paid",
      medicinesStr,
      opd.clinical_notes || "",
      opd.panchakarma_notes || "",
      opd.next_visit_date || "",
      driveLinkStr,
      new Date().toISOString(),
    ];

    if (foundRowIndex > 0) {
      // UPDATE existing row (duplicate prevention)
      const updateRange = `${sheetName}!A${foundRowIndex}:V${foundRowIndex}`;
      const updateRes = await fetch(
        `${SHEETS_API_URL}/${sheetId}/values/${encodeURIComponent(updateRange)}?valueInputOption=USER_ENTERED`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ range: updateRange, values: [rowData] }),
        },
      );
      if (!updateRes.ok) {
        const err = await updateRes.text();
        throw new Error(`Google Sheet update failed: ${err}`);
      }
      sheetRowIndex = foundRowIndex;
    } else {
      // APPEND new row
      const appendUrl = `${SHEETS_API_URL}/${sheetId}/values/${encodeURIComponent(sheetName)}!A:V:append?valueInputOption=USER_ENTERED`;
      const appendRes = await fetch(appendUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values: [rowData] }),
      });
      if (!appendRes.ok) {
        const err = await appendRes.text();
        throw new Error(`Google Sheet append failed: ${err}`);
      }
      const appendData = await appendRes.json();
      sheetRowIndex = existingRows.length + 1;
    }
  }

  // 5. UPDATE SYNC TRACKING RECORD
  await supabaseAdmin.from("google_sync_records").upsert({
    opd_id: opd.id,
    patient_id: opd.patient_id,
    status: "synced",
    drive_synced: driveLinks.length > 0 || !images.length,
    sheet_synced: Boolean(sheetId),
    sheet_row_index: sheetRowIndex,
    drive_folder_id: driveFolderId,
    drive_links: driveLinks,
    last_error: null,
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // Update global config last_sync_at
  await supabaseAdmin
    .from("google_sync_config")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("id", 1);

  return {
    opdId: opd.id,
    driveSynced: driveLinks.length > 0 || !images.length,
    sheetSynced: Boolean(sheetId),
    driveLinks,
    sheetRowIndex,
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json().catch(() => ({}));
    const { opdRecordId, syncAllPending, force } = body;

    // A. Sync single record
    if (opdRecordId) {
      const result = await syncSingleOpdRecord(supabaseAdmin, opdRecordId);
      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // B. Sync all pending or failed records
    if (syncAllPending) {
      let query = supabaseAdmin
        .from("google_sync_records")
        .select("opd_id")
        .in("status", ["pending", "failed", "retrying"]);

      const { data: records, error } = await query;
      if (error) {
        throw new Error(
          `Failed to query pending sync records: ${error.message}`,
        );
      }

      const results = [];
      for (const rec of records || []) {
        try {
          const res = await syncSingleOpdRecord(supabaseAdmin, rec.opd_id);
          results.push({ opdId: rec.opd_id, success: true, ...res });
        } catch (itemErr: any) {
          await supabaseAdmin
            .from("google_sync_records")
            .update({
              status: "failed",
              last_error: itemErr.message,
              retry_count: 1,
              updated_at: new Date().toISOString(),
            })
            .eq("opd_id", rec.opd_id);
          results.push({
            opdId: rec.opd_id,
            success: false,
            error: itemErr.message,
          });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          syncedCount: results.filter((r) => r.success).length,
          failedCount: results.filter((r) => !r.success).length,
          results,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        error: "Missing opdRecordId or syncAllPending in request body.",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: any) {
    console.error("google-sync error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Google sync operation failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
