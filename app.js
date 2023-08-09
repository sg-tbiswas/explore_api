const express = require("express");
const app = express();
const PORT = 3000;
const cors = require("cors");
const bodyParser = require("body-parser");
const getExploreData = require("./getExploreData");
const getSingleExploreData = require("./getSingleExploreData");
const getCitiesAndState = require("./getCitiesAndState");
const getPropertiesByAgentId = require("./getPropertiesByAgentId")

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const whitelist = [
  "http://localhost:3000",
  "http://localhost:5000",
  "http://localhost:5001",
  "https://gobyhomes.com",
  "https://goby-homes-qa-v2.web.app"
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
app.get("/getCities", getCitiesAndState);
app.get("/getPropertiesByAgentId", getPropertiesByAgentId);

app.listen(PORT, function (err) {
  if (err) console.log("Error in server setup");
  console.log("Server listening on Port", PORT);
});
