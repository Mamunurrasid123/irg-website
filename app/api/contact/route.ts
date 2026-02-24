import { NextResponse } from "next/server";

type ContactPayload = {
  name: string;
  email: string;
  role: string;
  message: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  try {
    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    const token = process.env.IRG_WEBHOOK_TOKEN;

    if (!webhookUrl || !token) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Server not configured: missing GOOGLE_SHEETS_WEBHOOK_URL or IRG_WEBHOOK_TOKEN",
        },
        { status: 500 }
      );
    }

    // ---- Safely parse JSON body ----
    let incoming: any = null;
    try {
      incoming = await req.json();
    } catch (err: any) {
      console.error("❌ Failed to parse JSON body:", err);
      return NextResponse.json(
        { ok: false, message: "Invalid JSON body (req.json failed)." },
        { status: 400 }
      );
    }

    const payload: ContactPayload = {
      name: String(incoming?.name || "").trim(),
      email: String(incoming?.email || "").trim(),
      role: String(incoming?.role || "").trim(),
      message: String(incoming?.message || "").trim(),
    };

    // ---- Validation ----
    if (!payload.name || !payload.email || !payload.role || !payload.message) {
      return NextResponse.json(
        { ok: false, message: "Missing required fields." },
        { status: 400 }
      );
    }
    if (!isValidEmail(payload.email)) {
      return NextResponse.json(
        { ok: false, message: "Invalid email address." },
        { status: 400 }
      );
    }

    // ---- Call Apps Script ----
    let res: Response;
    try {
      res = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        // token in body too (Apps Script often can't read headers reliably)
        body: JSON.stringify({ ...payload, token }),
        cache: "no-store",
      });
    } catch (err: any) {
      console.error("❌ Failed to fetch Apps Script:", err);
      return NextResponse.json(
        {
          ok: false,
          message: "Failed to reach Google Apps Script webhook.",
          details: String(err?.message || err),
        },
        { status: 502 }
      );
    }

    const responseText = await res.text();

    if (!res.ok) {
      console.error("❌ Apps Script returned non-OK:", res.status, responseText);
      return NextResponse.json(
        {
          ok: false,
          message: "Google Script webhook returned error.",
          status: res.status,
          details: responseText,
        },
        { status: 502 }
      );
    }

    // ---- Apps Script must return JSON { ok:true } ----
    let scriptJson: any = null;
    try {
      scriptJson = JSON.parse(responseText);
    } catch {
      scriptJson = null;
    }

    if (!scriptJson || scriptJson.ok !== true) {
      console.error("❌ Apps Script did not confirm saving:", responseText);
      return NextResponse.json(
        {
          ok: false,
          message: "Apps Script did not confirm saving to sheet.",
          details: responseText,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { ok: true, message: scriptJson.message || "Saved" },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("❌ Route crashed:", err);
    return NextResponse.json(
      {
        ok: false,
        message: "Server error (route crashed).",
        details: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}