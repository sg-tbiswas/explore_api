const express = require("express");
const app = express();
const PORT = 4001;
const mongoose = require("mongoose");
const cors = require("cors");
const cron = require("node-cron");
const bodyParser = require("body-parser");
const getExploreData = require("./getExploreData");
const getSingleExploreData = require("./getSingleExploreData");
const gobyHomes = require("./insertion");
const recordUpdate = require("./updation");
const imageUpload = require("./imageUpload");

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

cron.schedule("*/30 * * * *", async () => {
  await gobyHomes();
  await imageUpload();
  console.log("running a task every 30 minute");
});

cron.schedule("*/45 * * * *", async () => {
  await recordUpdate();
  console.log("running a task every 45 minute");
});

app.listen(PORT, function (err) {
  if (err) console.log("Error in server setup");
  console.log("Server listening on Port", PORT);
});
