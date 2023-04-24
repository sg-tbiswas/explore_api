const Cron = require("croner");
const nodecron = require("node-cron");
const gobyHomes = require("./insertion");
const recordUpdate = require("./updation");
const imageUpload = require("./imageUpload");
const concatePropertyImages = require("./concatePropertyImages");
const updateBindPropertyImages = require("./updateBindPropertyImages");

const cronJob1 = async () => {
  let fromInsertImage = false;
  let fromInsertData = false;
  try {
    fromInsertImage = await imageUpload();
    if (fromInsertImage === true) {
      fromInsertData = await gobyHomes();
    }
    // if (fromInsertData === true && fromInsertImage === true) {
    //   await concatePropertyImages();
    // }
    console.log("running a task every 30 minute.");
  } catch (error) {
    console.log("Something went wrong in 30 min cron.");
  }
};

let running = false;

nodecron.schedule("*/30 * * * *", async () => {
  if (running) {
    console.log(
      "Previous execution still in progress. Skipping this execution."
    );
    return;
  }
  running = true;
  console.log("Running cron job every two minutes");

  // Simulate a long-running task
  try {
    cronJob1();
  } catch (err) {
    console.log(err);
  } finally {
    console.log("Task Completed: ");
    running = false;
  }
});

nodecron.schedule("*/50 * * * *", async () => {
  try {
    const recordUpdateResult = await recordUpdate();
    // if (recordUpdateResult.type === true) {
    //   await updateBindPropertyImages(recordUpdateResult.data);
    // }
    console.log("running a task every 50 minute.");
  } catch (error) {
    console.log("Something went wrong in 50 min cron.");
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
