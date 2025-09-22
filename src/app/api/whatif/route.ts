// src/app/api/whatif/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    // Force IPv4 loopback, same as schedule/route.ts
    const backendUrl =
      process.env.NEXT_PUBLIC_LAYER2_BACKEND_URL_WHATIF ||
      "http://127.0.0.1:8000/whatif";

    const res = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store", // avoid stale responses
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "backend failed" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    // Catch JSON parse errors or network issues
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
