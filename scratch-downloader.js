async function testDownloader() {
  const videoId = "dQw4w9WgXcQ";
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    console.log("Fetching working Cobalt APIs...");
    const dirRes = await fetch("https://cobalt.directory/api/working?type=api");
    const dirJson = await dirRes.json();
    const instances = dirJson.data.youtube || [
      "https://melon.clxxped.lol",
      "https://api.qwkuns.me",
      "https://cobaltapi.kittycat.boo",
      "https://subito-c.meowing.de",
      "https://nuko-c.meowing.de"
    ];

    console.log(`Found ${instances.length} instances. Testing them...`);

    for (const api of instances) {
      try {
        console.log(`Testing API instance: ${api}`);
        const res = await fetch(api, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            url: youtubeUrl,
            videoQuality: "720",
            filenameStyle: "basic"
          })
        });

        console.log(`Instance ${api} status: ${res.status}`);
        const text = await res.text();
        console.log(`Response: ${text.substring(0, 300)}`);
        
        try {
          const data = JSON.parse(text);
          if (data.url) {
            console.log(`SUCCESS! Found stream URL: ${data.url}`);
            break;
          }
        } catch (e) {
          console.log("Not JSON");
        }
      } catch (err) {
        console.error(`Instance ${api} failed:`, err.message);
      }
    }
  } catch (e) {
    console.error("Failed to run test:", e.message);
  }
}

testDownloader();
