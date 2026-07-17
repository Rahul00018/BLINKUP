import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoUrl = searchParams.get("url") || "https://www.w3schools.com/html/mov_bbb.mp4";

  try {
    const res = await fetch(videoUrl);
    if (!res.ok) throw new Error("Failed to fetch media stream from source");

    const headers = new Headers();
    headers.set("Content-Type", res.headers.get("Content-Type") || "video/mp4");
    headers.set("Content-Disposition", `attachment; filename="video.mp4"`);
    headers.set("Access-Control-Allow-Origin", "*");

    return new Response(res.body, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error("Download proxy error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
