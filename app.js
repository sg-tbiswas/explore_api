const express = require("express");
const app = express();
const PORT = 3000;
const cors = require("cors");
const bodyParser = require("body-parser");
const dbConfig = require("./dbConfig");

const getExploreData = require("./api/getExploreData");
const getSingleExploreData = require("./api/getSingleExploreData");
const getCitiesAndState = require("./api/getCitiesAndState");
const getPropertiesByAgentId = require("./api/getPropertiesByAgentId");
const getPropertiesByOfficeId = require("./api/getPropertiesByOfficeId");

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const whitelist = [
  "http://localhost:3000",
  "http://localhost:5000",
  "http://localhost:5001",
  "https://gobyhomes.com",
  "https://goby-homes-qa-v2.web.app",
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
app.get("/getPropertiesByOfficeId", getPropertiesByOfficeId);

app.listen(PORT, function (err) {
  if (err) console.log("Error in server setup");
  console.log("Server listening on Port", PORT);
  dbConfig
    .connect()
    .then(() => {
      console.log("Connected to MongoDB");
    })
    .catch((error) => {
      console.error(error);
    });
});
