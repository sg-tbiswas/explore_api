const nodeCorn = require("node-cron");
const gobyHomes = require("./insertion");
const recordUpdate = require("./updation");
const imageUpload = require("./imageUpload");
const imageUploadAfterInsert = require("./imageUploadAfterInsert");
const Cron = require("croner");
const os = require("os");

setInterval(() => {
  const cpuUsage = os
    .cpus()
    .reduce(
      (acc, cpu) =>
        acc + cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.irq,
      0
    );
  const systemUptime = os.uptime();
  const processUptime = process.uptime();
  const cpuUsagePercent =
    (100 * cpuUsage) /
    ((systemUptime - processUptime) * os.cpus().length * 1000);
  const used = process.memoryUsage().heapUsed / 1024 / 1024;

  console.log(
    `The current memory usage is approximately ${used.toFixed(2)} MB`
  );
  console.log(`CPU Usage: ${cpuUsagePercent.toFixed(2)}%`);
}, 1000);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cronJob1 = async () => {
  let fromInsertData = false;
  try {
    console.log("running a task every 10 minute.", new Date().toISOString());
    fromInsertData = await gobyHomes();
    if (fromInsertData && fromInsertData.length > 0) {
      await sleep(10000);
      await imageUploadAfterInsert(fromInsertData);
    }
  } catch (error) {
    console.log("Something went wrong in 10 min Insert cron.");
  }
};

let corn1Running = false;

Cron("*/10 * * * *", async () => {
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

Cron("*/25 * * * *", async () => {
  let fromRecordUpdate = false;
  if (corn2Running) {
    return;
  }
  corn2Running = true;

  try {
    console.log("running a task every 25 minute.", new Date().toISOString());
    fromRecordUpdate = await recordUpdate();
    if (fromRecordUpdate) {
      await sleep(10000);
      await imageUpload();
    }
  } catch (error) {
    console.log("Something went wrong in 25 min Update cron.");
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
