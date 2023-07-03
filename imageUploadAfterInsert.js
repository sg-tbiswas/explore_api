const fs = require("fs");
const _ = require("lodash");
const MongoClient = require("mongodb").MongoClient;
const CONSTANTS = require("./constants");
const { RETS_CLIENT } = require("./utils");

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
      `error from checkExistingMediaURL imageUploadAfterInsert() ${new Date().toUTCString()}`,
      e.message
    );
    return false;
  }
}

const imageUploadAfterInsert = async (listingChunks) => {
  try {
    if (listingChunks) {
      const client = new MongoClient(CONSTANTS.DB_CONNECTION_URI);
      await client.connect();

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
                const chkData = await checkExistingMediaURL(obj, client);
                if (!chkData) {
                  continue;
                } else if (Array.isArray(chkData)) {
                  if (chkData.length < 1) {
                    records.push(obj);
                  }
                }
              }
            }
          } catch (err) {
            console.error(
              `Error searching for ListingId ${id}: ${err.message} from imageUploadAfterInsert()`
            );
            continue; // Skip to next iteration of the loop
          }
        }
      }
      if (records.length > 0) {
        await addRecordsToMongoDBImage(records, client);
        console.log(
          "All images fetched and added successfully! imageUploadAfterInsert()"
        );
      } else {
        console.log("No images available to add! imageUploadAfterInsert()");
      }
    }
  } catch (error) {
    console.error(
      `Error occurred in imageUploadAfterInsert function: ${new Date().toUTCString()} ${
        error.message
      }`
    );
  }
};

const addRecordsToMongoDBImage = async (records, client) => {
  try {
    const collection = client
      .db(CONSTANTS.DB_NAME)
      .collection("propertyDataImages");
    await collection.insertMany(records, (err, res) => {
      if (err) throw err;
      console.log(
        `${res.insertedCount} documents inserted into propertyDataImages`
      );
      client.close();
    });
  } catch (error) {
    console.error(
      `error occurred add record to DBImage ${new Date().toUTCString()}`,
      error.message
    );
  } finally {
    await client.close();
  }
};
module.exports = imageUploadAfterInsert;
