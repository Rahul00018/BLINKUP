import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId");
  const directUrl = searchParams.get("url");

  // 1. Direct stream proxying (if query contains url=...)
  if (directUrl) {
    try {
      const res = await fetch(directUrl);
      if (!res.ok) throw new Error("Failed to fetch stream from source");

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

  // 2. Fetching actual high-quality stream URL using Cobalt (if query contains videoId=...)
  if (videoId) {
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    try {
      // Query cobalt.directory for working instances
      const dirRes = await fetch("https://cobalt.directory/api/working?type=api", {
        next: { revalidate: 600 } // cache for 10 minutes
      });
      const dirJson = await dirRes.json();
      const instances: string[] = dirJson.data?.youtube || [
        "https://melon.clxxped.lol",
        "https://api.qwkuns.me",
        "https://cobaltapi.kittycat.boo",
        "https://subito-c.meowing.de",
        "https://nuko-c.meowing.de",
        "https://cobaltapi.squair.xyz"
      ];

      // Try instances one by one
      for (const api of instances) {
        try {
          const res = await fetch(api, {
            method: "POST",
            headers: {
              "Accept": "application/json",
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              url: youtubeUrl,
              videoQuality: "720", // high quality MP4
              filenameStyle: "basic"
            })
          });

          if (res.status === 200) {
            const data = await res.json();
            if (data.url) {
              return NextResponse.json({ downloadUrl: data.url });
            }
          }
        } catch (e) {
          console.error(`Cobalt instance ${api} failed:`, e);
        }
      }

      // If all cobalt instances fail, throw error to trigger client fallback
      throw new Error("All download servers are busy. Please try again in a few moments.");

    } catch (error: any) {
      console.error("Failed to retrieve actual download URL:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
}
