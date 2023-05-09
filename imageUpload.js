const fs = require("fs");
const MongoClient = require("mongodb").MongoClient;
const CONSTANTS = require("./constants");
const { RETS_CLIENT, getTodayDate } = require("./utils");
var os = require("os");
const _ = require("lodash");

async function checkExistingMediaURL(data, client) {
  try {
    const collection = client
      .db(CONSTANTS.DB_NAME)
      .collection("propertyDataImages");
    const ddt = await collection.find({ MediaURL: data.MediaURL }).toArray();
    if (ddt[0]) {
      return ddt[0];
    } else {
      return false;
    }
  } catch (e) {
    console.error("error from checkExistingMediaURL", e);
    return false;
  }
}

const imageUpload = async () => {
  try {
    const nodeClient = new MongoClient(CONSTANTS.DB_CONNECTION_URI);
    await nodeClient.connect();

    const listingChunks = await getListingIds();
    if (listingChunks && listingChunks.length > 0) {
      let records = [];

      for (const id of listingChunks) {
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
              for (const obj of query.Objects) {
                const chkData = await checkExistingMediaURL(obj, nodeClient);
                if (!chkData) {
                  records.push(obj);
                }
                //records.push(obj);
              }
            }
          } catch (err) {
            console.error(
              `Error searching for ListingId ${id}: ${err.message} imageUpload()`
            );
            continue;
          }
        } else {
          continue;
        }
      }

      if (records.length > 0) {
        await addRecordsToMongoDBImage(records, nodeClient);
        console.log("All images fetched and added successfully! imageUpload()");
      } else {
        console.log("No images available to add! imageUpload()");
      }
    }
  } catch (error) {
    console.error(`Error occurred in imageUpload function: ${error.message}`);
  }
};

const getListingIds = async () => {
  try {
    const now = new Date();

    // Subtract 45 minutes from the current datetime
    const fortyFiveMinutesAgo = new Date(now.getTime() - 45 * 60000);

    // Format the datetime string without the timezone indicator
    const formattedTime = fortyFiveMinutesAgo.toISOString().slice(0, -1);
    const currentDate = new Date(now.getTime()).toISOString().slice(0, -1);

    const listingIdData = await RETS_CLIENT.search(
      "Property",
      "ALL",
      `(StandardStatus=|Active,Pending,Active Under Contract) AND (MLSListDate=${getTodayDate()}) AND (ModificationTimestamp=${formattedTime}-${currentDate})`,
      {
        Select: "ListingId",
      }
    );
    const listingIds = listingIdData.Objects.map((obj) => obj.ListingId);
    return listingIds;
  } catch (err) {
    console.error("Error getting listing IDs for Property Images", err.message);
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
      client.close();
    });
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
};

module.exports = imageUpload;
