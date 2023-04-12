const express = require("express");
const app = express();
const PORT = 3000;
const mongoose = require("mongoose");
const cors = require("cors");
const cron = require("node-cron");
const bodyParser = require("body-parser");
const getExploreData = require("./getExploreData");
const getSingleExploreData = require("./getSingleExploreData");
const gobyHomes = require("./insertion");
const recordUpdate = require("./updation");
const imageUpload = require("./imageUpload");
const concatePropertyImages = require("./concatePropertyImages");
const updateBindPropertyImages = require("./updateBindPropertyImages");

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const whitelist = [
  "http://localhost:5000",
  "http://localhost:5001",
  "https://gobyhomes.com/",
];

const corsOptions = {
  origin: whitelist,
  credentials: true, //access-control-allow-credentials:true
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: "50mb" }));

app.get("/getProperities", getExploreData);
app.get("/getPropertyDetails", getSingleExploreData);

cron.schedule("*/45 * * * *", async () => {
  const fromInsertData = await gobyHomes();
  const fromInsertImage = await imageUpload();
  if (fromInsertData === true && fromInsertImage === true) {
    console.log("concate property images will be called");
    await concatePropertyImages();
  }
  console.log("running a task every 45 minute");
});

cron.schedule("*/60 * * * *", async () => {
  const recordUpdateResult = await recordUpdate();
  if (recordUpdateResult.type === true) {
    await updateBindPropertyImages(recordUpdateResult.data);
  }
  console.log("running a task every 60 minute");
});

app.listen(PORT, function (err) {
  if (err) console.log("Error in server setup");
  console.log("Server listening on Port", PORT);
});
