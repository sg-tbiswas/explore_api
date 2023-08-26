const fs = require("fs");
const _ = require("lodash");

const MongoClient = require("mongodb").MongoClient;
const CONSTANTS = require("./constants.js");

const resetOffset = async () => {
  try {
    const client = new MongoClient(CONSTANTS.DB_CONNECTION_URI);
    await client.connect();
    const offCollection = client.db(CONSTANTS.DB_NAME).collection("dataOperationRecord");
    await offCollection.updateOne(
      { _id: new ObjectId("64e9c0aaa5312247dc2452be") },
      {
        $set: { lastOffset: 1 },
      }
    );
    await client.close();
  } catch (error) {
    console.error(
      `Error occurred in resetOffset function: ${new Date().toUTCString()} ${
        error.message
      }`
    );
    return true;
  }
};
module.exports = resetOffset;
