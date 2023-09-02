const gobyHomes = require("./insertion");
const recordUpdate = require("./updation");
const imageUpload = require("./imageUpload");
const statusUpdate = require("./statusUpdate");
const imageUploadAfterInsert = require("./imageUploadAfterInsert");
const Cron = require("croner");
const dbConnection = require("./dbConnection");
const os = require("os");
const { exec } = require("child_process");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let corn1Running = false;
let corn2Running = false;
let corn3Running = false;

Cron("*/30 * * * *", async () => {
  let fromInsertData = false;

  if (corn1Running) {
    console.log("Already running 30 minute cron.", new Date().toUTCString());
    return;
  }
  corn1Running = true;
  try {
    const db = new dbConnection();
    const client = await db.connect();
    try {
      console.log("running a task every 30 minute.", new Date().toUTCString());

      fromInsertData = await gobyHomes(client);
      if (fromInsertData && fromInsertData.length > 0) {
        await sleep(10000);
        await imageUploadAfterInsert(fromInsertData, client);
        corn1Running = false;
      }
      await db.disconnect();
    } catch (error) {
      console.error(
        `Something went wrong in 30 min Insert cron.${new Date().toUTCString()}`,
        error.message
      );
      corn1Running = false;
    } finally {
      await db.disconnect();
    }
  } catch (error) {
    console.log("DB connection error!", error);
  }
});

Cron("45 * * * *", async () => {
  let fromRecordUpdate = false;
  if (corn2Running) {
    console.log(
      "Already running 45 minute of hour cron.",
      new Date().toUTCString()
    );
    return;
  }
  corn2Running = true;
  try {
    const db = new dbConnection();
    const client = await db.connect();
    try {
      console.log(
        "running a task every 45 minute of hour.",
        new Date().toUTCString()
      );
      fromRecordUpdate = await recordUpdate(client);
      if (fromRecordUpdate) {
        await sleep(10000);
        await imageUpload(client);
        corn2Running = false;
      }
      await db.disconnect();
    } catch (error) {
      console.error(
        `Something went wrong in 45 min of hour Update cron.${new Date().toUTCString()}`,
        error.message
      );
      corn2Running = false;
    } finally {
      await db.disconnect();
    }
  } catch (error) {
    console.log("DB connection error!", error);
  }
});

Cron("*/20 * * * *", async () => {
  if (corn3Running) {
    console.log("Already running 20 minute cron.", new Date().toUTCString());
    return;
  }
  corn3Running = true;

  try {
    const db = new dbConnection();
    const client = await db.connect();
    try {
      console.log("running a task every 20 min.", new Date().toUTCString());
      await statusUpdate(client);
      corn3Running = false;
      await db.disconnect();
    } catch (error) {
      console.error(
        `Something went wrong in 20 min status Update cron.${new Date().toUTCString()}`,
        error.message
      );
      corn3Running = false;
    } finally {
      await db.disconnect();
    }
  } catch (error) {
    console.log("DB connection error!", error);
  }
});

// Cron("0 */2 * * *", async () => {
//   console.log(`Cron Job and MongoDB restarted at ${new Date().toUTCString()}`);
//   exec("sudo systemctl restart mongod.service", (error, stdout, stderr) => {
//     if (error) {
//       console.log(`error: ${error.message}`);
//       return;
//     }
//     if (stderr) {
//       console.log(`stderr: ${stderr}`);
//       return;
//     }
//     console.log(`mongodb restarted: ${stdout}`);
//   });
//   await sleep(5000);
//   exec("pm2 restart 1", (error, stdout, stderr) => {
//     if (error) {
//       console.log(`error: ${error.message}`);
//       return;
//     }
//     if (stderr) {
//       console.log(`stderr: ${stderr}`);
//       return;
//     }
//     console.log(`pm2 cron restarted: ${stdout}`);
//   });
// });
