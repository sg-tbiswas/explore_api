const fs = require("fs");
const MongoClient = require("mongodb").MongoClient;
const CONSTANTS = require("./constants");
const { RETS_CLIENT, getTodayDate } = require("./utils");
var os = require("os");
const _ = require("lodash");

async function checkExistingMediaURL(data, client) {
  const collection = client
      .db(CONSTANTS.DB_NAME)
      .collection("propertyDataImages");
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

const imageUpload = async (client) => {
  try {
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
                const chkData = await checkExistingMediaURL(obj, client);
                if (!chkData) {
                  continue;
                } else if (Array.isArray(chkData)) {
                  if (chkData.length < 1) {
                    records.push(obj);
                  }
                }
              }

              if (records.length > 0) {
                await addRecordsToMongoDBImage(records, client);
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
      await RETS_CLIENT.logout();
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
    let allRecords = [];
    const now = new Date();

    // Subtract 3 hours from the current datetime
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

    // Format the datetime string without the timezone indicator
    const currentDate = new Date(now.getTime()).toISOString().slice(0, -1);
    const midnight = new Date(new Date().setHours(0, 0, 0, 0));
    const newFormattedTime = threeHoursAgo.toISOString().slice(0, -1);

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
    allRecords = listingIdData?.Objects?allRecords.concat(listingIdData.Objects):[];

    const listingIds = allRecords.map((obj) => obj.ListingId);
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

module.exports = imageUpload;
