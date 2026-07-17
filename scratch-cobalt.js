const url = "https://api.cobalt.tools/";

fetch(url, {
  method: "POST",
  headers: {
    "Accept": "application/json",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    vQuality: "720"
  })
})
  .then(async (res) => {
    console.log("Response Status:", res.status);
    const text = await res.text();
    console.log("Response Data:", text);
  })
  .catch((err) => {
    console.error("Fetch Error:", err);
  });
