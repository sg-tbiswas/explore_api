const nodeCorn = require("node-cron");
const gobyHomes = require("./insertion");
const recordUpdate = require("./updation");
const imageUpload = require("./imageUpload");
const imageUploadAfterInsert = require("./imageUploadAfterInsert");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cronJob1 = async () => {
  let fromInsertData = false;
  try {
    console.log("running a task every 2 minute.", new Date().toISOString());
    fromInsertData = await gobyHomes();
    if (fromInsertData && fromInsertData.length > 0) {
      await sleep(10000);
      await imageUploadAfterInsert(fromInsertData);
    }
  } catch (error) {
    console.log("Something went wrong in 2 min cron.");
  }
};

let corn1Running = false;

nodeCorn.schedule("*/2 * * * *", async () => {
  if (corn1Running) {
    return;
  }
  corn1Running = true;
  try {
    cronJob1();
  } catch (err) {
    console.log(err);
  } finally {
    corn1Running = false;
  }
});

let corn2Running = false;

nodeCorn.schedule("*/2 * * * *", async () => {
  let fromRecordUpdate = false;
  if (corn2Running) {
    return;
  }
  corn2Running = true;

  try {
    console.log("running a task every 3 minute.", new Date().toISOString());
    fromRecordUpdate = await recordUpdate();
    if (fromRecordUpdate) {
      await sleep(10000);
      await imageUpload();
    }
  } catch (error) {
    console.log("Something went wrong in 3 min cron.");
  } finally {
    corn2Running = false;
  }
});

// Cron("*/30 * * * *", async () => {
//   let fromInsertImage = false;
//   let fromInsertData = false;
//   try {
//     fromInsertImage = await imageUpload();
//     if (fromInsertImage === true) {
//       fromInsertData = await gobyHomes();
//     }
//     // if (fromInsertData === true && fromInsertImage === true) {
//     //   await concatePropertyImages();
//     // }
//     console.log("running a task every 30 minute.");
//   } catch (error) {
//     console.log("Something went wrong in 30 min cron.");
//   }
// });

// Cron("*/50 * * * *", async () => {
//   try {
//     const recordUpdateResult = await recordUpdate();
//     // if (recordUpdateResult.type === true) {
//     //   await updateBindPropertyImages(recordUpdateResult.data);
//     // }
//     console.log("running a task every 50 minute.");
//   } catch (error) {
//     console.log("Something went wrong in 50 min cron.");
//   }
// });
