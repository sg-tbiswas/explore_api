const nodeCorn = require("node-cron");
const gobyHomes = require("./insertion");
const recordUpdate = require("./updation");
const imageUpload = require("./imageUpload");

const cronJob1 = async () => {
  let fromInsertImage = false;
  let fromInsertData = false;
  try {
    fromInsertImage = await imageUpload();
    if (fromInsertImage === true) {
      fromInsertData = await gobyHomes();
    }
  } catch (error) {
    console.log("Something went wrong in 30 min cron.");
  }
};

let corn1Running = false;

nodeCorn.schedule("*/30 * * * *", async () => {
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

nodeCorn.schedule("*/50 * * * *", async () => {
  if (corn2Running) {
    return;
  }
  corn2Running = true;
  try {
    await recordUpdate();
    console.log("running a task every 50 minute.");
  } catch (error) {
    console.log("Something went wrong in 50 min cron.");
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
