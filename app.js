const express = require("express");
const app = express();
const PORT = 4001;
const mongoose = require("mongoose");
var cors = require("cors");
var bodyParser = require("body-parser");
const getExploreData = require("./getExploreData");

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

//localhost:27017
app.get("/explore", getExploreData);

app.listen(PORT, function (err) {
  if (err) console.log("Error in server setup");
  console.log("Server listening on Port", PORT);
});
