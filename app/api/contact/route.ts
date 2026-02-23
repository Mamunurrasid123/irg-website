import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { name, email, role, message } = await req.json();

    if (!name || !email || !role || !message) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields." },
        { status: 400 }
      );
    }

    const webhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    const token = process.env.IRG_WEBHOOK_TOKEN;

    if (!webhook || !token) {
      return NextResponse.json(
        { ok: false, error: "Server not configured." },
        { status: 500 }
      );
    }

    const response = await fetch(webhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name,
        email,
        role,
        message,
        source: "irg-auw.app",
        token
      })
    });

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (!response.ok || !data?.ok) {
      return NextResponse.json(
        { ok: false, error: data?.error || "Submission failed." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });

  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Server error." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: "Use POST method." },
    { status: 405 }
  );
}