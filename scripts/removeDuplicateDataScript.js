const fs = require("fs");
const _ = require("lodash");
const CONSTANTS = require("../constants.js");
const dbConn = require("../dbConnection.js");

async function checkExistingRecord() {
  try {
    const db = new dbConn();
    const client = await db.connect();
    await client.connect();

    const propertyDataCollection = client
      .db(CONSTANTS.DB_NAME)
      .collection("propertyData");

    const duplicateResults = await propertyDataCollection
      .aggregate([
        {
          $group: {
            _id: { listing_id: "$listing_id" },
            duplicates: { $addToSet: "$_id" },
            count: { $sum: 1 },
          },
        },
        {
          $match: {
            count: { $gt: 1 },
          },
        },
      ])
      .toArray();

    const deleteIds = duplicateResults
      .map((result) => result.duplicates.slice(1))
      .flat();

    console.log("data>>", duplicateResults);
    console.log("duplicateIds>>", deleteIds);

    if (deleteIds.length > 0) {
      const bulkOperations = deleteIds.map((id) => ({
        deleteOne: {
          filter: { _id: id },
        },
      }));

      await propertyDataCollection.bulkWrite(bulkOperations);
    }
  } catch (error) {
    console.error(
      `error from checkExistingRecord: ${new Date().toUTCString()}`,
      error.message
    );
    return false;
  }
}

checkExistingRecord();
