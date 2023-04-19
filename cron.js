const Cron = require("croner");
const gobyHomes = require("./insertion");
const recordUpdate = require("./updation");
const imageUpload = require("./imageUpload");
const concatePropertyImages = require("./concatePropertyImages");
const updateBindPropertyImages = require("./updateBindPropertyImages");

Cron("*/30 * * * *", async () => {
  let fromInsertImage = false;
  let fromInsertData = false;
  try {
    fromInsertImage = await imageUpload();
    if (fromInsertImage === true) {
      fromInsertData = await gobyHomes();
    }
    if (fromInsertData === true && fromInsertImage === true) {
      await concatePropertyImages();
    }
    console.log("running a task every 30 minute.");
  } catch (error) {
    console.log("Something went wrong in 30 min cron.");
  }
});

Cron("*/50 * * * *", async () => {
  try {
    const recordUpdateResult = await recordUpdate();
    if (recordUpdateResult.type === true) {
      await updateBindPropertyImages(recordUpdateResult.data);
    }
    console.log("running a task every 50 minute.");
  } catch (error) {
    console.log("Something went wrong in 50 min cron.");
  }
});
