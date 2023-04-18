const cron = require("node-cron");
const gobyHomes = require("./insertion");
const recordUpdate = require("./updation");
const imageUpload = require("./imageUpload");
const concatePropertyImages = require("./concatePropertyImages");
const updateBindPropertyImages = require("./updateBindPropertyImages");

cron.schedule("*/15 * * * *", async () => {
  const fromInsertData = await gobyHomes();
  const fromInsertImage = await imageUpload();
  if (fromInsertData === true && fromInsertImage === true) {
    console.log("concate property images will be called");
    await concatePropertyImages();
  }
  console.log("running a task every 15 minute.");
});

cron.schedule("*/25 * * * *", async () => {
  const recordUpdateResult = await recordUpdate();
  if (recordUpdateResult.type === true) {
    await updateBindPropertyImages(recordUpdateResult.data);
  }
  console.log("running a task every 25 minute.");
});
