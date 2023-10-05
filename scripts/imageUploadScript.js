const fs = require("fs");
const MongoClient = require("mongodb").MongoClient;
const CONSTANTS = require("../constants");
const { RETS_CLIENT, getTodayDate } = require("../utils");
var os = require("os");
const _ = require("lodash");
const dbConn = require("../dbConnection.js");

async function checkExistingMediaURL(data, client) {
  try {
    const collection = client
      .db(CONSTANTS.DB_NAME)
      .collection("propertyDataImages");
    const ddt = await collection.find({ MediaURL: data.MediaURL }).toArray();
    if (ddt) {
      return ddt;
    } else {
      return [];
    }
  } catch (e) {
    console.error(
      `error from checkExistingMediaURL ${new Date().toUTCString()}`,
      e
    );
    return false;
  }
}

const imageUpload = async () => {
  try {
    const db = new dbConn();
    const client = await db.connect();
    await client.connect();
    const listingChunks = await getListingIds();
    console.log("listingChunks>>", listingChunks?.length);

    if (listingChunks && listingChunks.length > 0) {
      let gcn = 0;
      let pcnt = 0;
      const allRecords = [];
      const newRecords = [];
      for (const id of listingChunks) {
        ++pcnt;
        console.log(pcnt, id);
        if (id) {
          try {
            const query = await RETS_CLIENT.search(
              "Media",
              "PROP_MEDIA",
              `(ListingId=${id})`,
              {
                Select:
                  "ListingId,MediaURL,MediaURLFull,MediaURLHD,MediaURLHiRes,MediaURLThumb,MediaURLMedium",
              }
            );
            if (query.Objects && query.Objects.length > 0) {
              allRecords.push(...query.Objects);
            }
          } catch (err) {
            console.error(
              `Error searching for ListingId ${id}: ${
                err.message
              } imageUpload() ${new Date().toUTCString()}`
            );
            continue;
          }
        } else {
          continue;
        }
      }
      console.log("allRecords>>>>", allRecords.length);

      for (const obj of allRecords) {
        const chkData = await checkExistingMediaURL(obj, client);
        if (!chkData) {
          continue;
        } else if (Array.isArray(chkData)) {
          if (chkData.length < 1) {
            newRecords.push(obj);
            gcn++;
          }
        }
      }
      if (newRecords.length > 0) {
        await addRecordsToMongoDBImage(newRecords, client);
      } else {
        console.log("No images available to add! imageUpload()");
      }

      console.log(
        `All images fetched and added successfully! imageUpload()=> ${gcn}`
      );
    }
  } catch (error) {
    console.error(
      `Error occurred in imageUpload function: ${new Date().toUTCString()} ${
        error.message
      }`
    );
  } finally {
    const db = new dbConn();
    await db.disconnect();
  }
};

const getListingIds = async () => {
  try {
    const now = new Date();
    const listingIdData = await RETS_CLIENT.search(
      "Property",
      "ALL",
      `(StandardStatus=|Active,Pending,Active Under Contract) AND (MLSListDate=2023-10-05)`,
      {
        Select: "ListingId",
        Offset: 550,
      }
    );

    const listingIds = listingIdData.Objects.map((obj) => obj.ListingId);
    return listingIds;
  } catch (err) {
    console.error(
      `Error getting listing IDs for Property Images: ${new Date().toUTCString()}`,
      err.message
    );
    return false;
  }
};

const addRecordsToMongoDBImage = async (records, client) => {
  try {
    const collection = client
      .db(CONSTANTS.DB_NAME)
      .collection("propertyDataImages");
    await collection.insertMany(records, (err, res) => {
      if (err) throw err;
      console.log(`${res.insertedCount} documents inserted`);
    });
  } catch (e) {
    console.error(`error occur ${new Date().toUTCString()}`, e.message);
  }
};

imageUpload();
