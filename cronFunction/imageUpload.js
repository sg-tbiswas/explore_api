const fs = require("fs");
const MongoClient = require("mongodb").MongoClient;
const CONSTANTS = require("../constants");
const { RETS_CLIENT, getTodayDate } = require("../utils");
var os = require("os");
const _ = require("lodash");

async function checkExistingMediaURL(data, collection) {
  try {
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
  const client = new MongoClient(CONSTANTS.DB_CONNECTION_URI);
  try {
    await client.connect();
    const collection = client
      .db(CONSTANTS.DB_NAME)
      .collection("propertyDataImages");

    const listingChunks = await getListingIds();
    if (listingChunks && listingChunks.length > 0) {
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
              let records = [];
              for (const obj of query.Objects) {
                const chkData = await checkExistingMediaURL(obj, collection);
                if (!chkData) {
                  continue;
                } else if (Array.isArray(chkData)) {
                  if (chkData.length < 1) {
                    records.push(obj);
                  }
                }
              }

              if (records.length > 0) {
                await addRecordsToMongoDBImage(records, collection);
              } else {
                console.log(
                  `No images available for listingID ${id} to add! imageUpload()`
                );
              }
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
      console.log(`All images fetched and added successfully! imageUpload()`);
    }
  } catch (error) {
    console.error(
      `Error occurred in imageUpload function: ${new Date().toUTCString()} ${
        error.message
      }`
    );
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
    const midnight = new Date(new Date().setHours(0, 0, 0, 0));
    const newFormattedTime = midnight.toISOString().slice(0, -1);

    /*
    const listingIdData = await RETS_CLIENT.search(
      "Property",
      "ALL",
      `(StandardStatus=|Active,Pending,Active Under Contract) AND (MLSListDate=${getTodayDate()}) AND (ModificationTimestamp=${formattedTime}-${currentDate})`,
      {
        Select: "ListingId",
      }
    );
*/
    const listingIdData = await RETS_CLIENT.search(
      "Property",
      "ALL",
      `(StandardStatus=|Active,Pending,Active Under Contract) AND (ModificationTimestamp=${newFormattedTime}+)`,
      {
        Select: "ListingId",
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

const addRecordsToMongoDBImage = async (records, collection) => {
  try {
    await collection.insertMany(records, (err, res) => {
      if (err) throw err;
      console.log(`${res.insertedCount} documents inserted`);
    });
  } catch (e) {
    console.error(`error occur ${new Date().toUTCString()}`, e.message);
  }
};

module.exports = imageUpload;
