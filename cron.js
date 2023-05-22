const gobyHomes = require("./insertion");
const recordUpdate = require("./updation");
const imageUpload = require("./imageUpload");
const imageUploadAfterInsert = require("./imageUploadAfterInsert");
const Cron = require("croner");
const os = require("os");
const { exec } = require("child_process");

// setInterval(() => {
//   const cpuUsage = os
//     .cpus()
//     .reduce(
//       (acc, cpu) =>
//         acc + cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.irq,
//       0
//     );
//   const systemUptime = os.uptime();
//   const processUptime = process.uptime();
//   const cpuUsagePercent =
//     (100 * cpuUsage) /
//     ((systemUptime - processUptime) * os.cpus().length * 1000);
//   const used = process.memoryUsage().heapUsed / 1024 / 1024;

//   console.log(
//     `The current memory usage is approximately ${used.toFixed(2)} MB`
//   );
//   console.log(`CPU Usage: ${cpuUsagePercent.toFixed(2)}%`);
// }, 1000);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cronJob1 = async () => {
  let fromInsertData = false;
  try {
    console.log("running a task every 30 minute.", new Date());
    fromInsertData = await gobyHomes();
    if (fromInsertData && fromInsertData.length > 0) {
      await sleep(10000);
      await imageUploadAfterInsert(fromInsertData);
    }
  } catch (error) {
    console.log("Something went wrong in 30 min Insert cron.", error.message);
  }
};

let corn1Running = false;

Cron("*/30 * * * *", async () => {
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

Cron("*/55 * * * *", async () => {
  let fromRecordUpdate = false;
  if (corn2Running) {
    return;
  }
  corn2Running = true;

  try {
    console.log("running a task every 55 minute.", new Date());
    fromRecordUpdate = await recordUpdate();
    if (fromRecordUpdate) {
      await sleep(10000);
      await imageUpload();
    }
  } catch (error) {
    console.log("Something went wrong in 55 min Update cron.", error.message);
  } finally {
    corn2Running = false;
  }
});

Cron("*/1 * * * *", async () => {
  console.log(`Cron Job and MongoDB restarted at ${new Date()}`);
  // exec("pm2 stop 1", (error, stdout, stderr) => {
  //   if (error) {
  //     console.log(`error: ${error.message}`);
  //     return;
  //   }
  //   if (stderr) {
  //     console.log(`stderr: ${stderr}`);
  //     return;
  //   }
  //   console.log(`stdout: ${stdout}`);
  // });
  // await sleep(1000);
  exec("sudo systemctl restart mongod.service", (error, stdout, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
  });
  await sleep(5000);
  exec("pm2 restart 1", (error, stdout, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
  });
});
