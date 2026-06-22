"use strict";
const app  = require("./api/index");
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`NPI Registry Search running at http://localhost:${port}`);
  console.log(`Test pages:`);
  console.log(`  http://localhost:${port}/`);
  console.log(`  http://localhost:${port}/static-test`);
  console.log(`  http://localhost:${port}/mock-search`);
  console.log(`  http://localhost:${port}/search?number=1003000126`);
});
