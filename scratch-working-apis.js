fetch("https://cobalt.directory/api/working?type=api")
  .then(res => res.json())
  .then(json => {
    console.log("Response:", JSON.stringify(json, null, 2));
  })
  .catch(err => console.error(err));
