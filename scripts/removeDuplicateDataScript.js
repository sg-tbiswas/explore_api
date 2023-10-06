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

async function checkExistingImage() {
  try {
    const db = new dbConn();
    const client = await db.connect();
    await client.connect();

    const propertyDataImageCollection = client
      .db(CONSTANTS.DB_NAME)
      .collection("propertyDataImages");

    const offset = 0; // Change this to the desired offset
    const limit = 100; // Change this to the desired limit

    const duplicateImages = await propertyDataImageCollection
      .aggregate([
        {
          $group: {
            _id: { MediaURL: "$MediaURL" },
            duplicates: { $addToSet: "$_id" },
            count: { $sum: 1 },
          },
        },
        {
          $match: {
            count: { $gt: 1 },
          },
        },
        {
          $skip: offset,
        },
        {
          $limit: limit,
        },
      ])
      .toArray();

    const deleteImageIds = duplicateImages
      .map((result) => result.duplicates.slice(1))
      .flat();

    console.log("duplicateImages>>", duplicateImages);
    console.log("deleteImageIds>>", deleteImageIds);

    /*
    if (deleteImageIds.length > 0) {
      const bulkOperations = deleteImageIds.map((id) => ({
        deleteOne: {
          filter: { _id: id },
        },
      }));

      await propertyDataCollection.bulkWrite(bulkOperations);
    }
    */
  } catch (error) {
    console.error(
      `error from checkExistingRecord: ${new Date().toUTCString()}`,
      error.message
    );
    return false;
  }
}

checkExistingImage();

//checkExistingRecord();
