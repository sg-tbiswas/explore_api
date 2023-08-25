const fs = require("fs");
const _ = require("lodash");
const MongoClient = require("mongodb").MongoClient;
const CONSTANTS = require("../constants");
const { RETS_CLIENT } = require("../utils");

async function checkExistingMediaURL(data, collection) {
  try {
    const ddt = await collection.find({ MediaURL: data.MediaURL }).toArray();
    return ddt;
  } catch (e) {
    console.error(
      `error from checkExistingMediaURL imageUploadAfterInsert() ${new Date().toUTCString()}`,
      e.message
    );
    return false;
  }
}

const imageUploadAfterInsert = async (listingChunks) => {
  const client = new MongoClient(CONSTANTS.DB_CONNECTION_URI);
  try {
    await client.connect();
    const collection = client
      .db(CONSTANTS.DB_NAME)
      .collection("propertyDataImages");

    if (listingChunks) {
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
              const records = [];
              for (const obj of query.Objects) {
                const chkData = await checkExistingMediaURL(obj, collection);
                if (chkData && Array.isArray(chkData) && chkData.length === 0) {
                  records.push(obj);
                }
              }
              if (records.length > 0) {
                await addRecordsToMongoDBImage(records, collection);
              } else {
                console.log(
                  `No images available for listingID ${id} to add! imageUploadAfterInsert()`
                );
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
      console.log(
        `All images fetched and added successfully! imageUploadAfterInsert()`
      );
    }
  } catch (error) {
    console.error(
      `Error occurred in imageUploadAfterInsert function: ${new Date().toUTCString()} ${
        error.message
      }`
    );
  } finally {
    await client.close();
  }
};

const addRecordsToMongoDBImage = async (records, collection) => {
  try {
    const result = await collection.insertMany(records);
    console.log(
      `${result.insertedCount} documents inserted into propertyDataImages`
    );
  } catch (error) {
    console.error(
      `error occurred add record to DBImage ${new Date().toUTCString()}`,
      error.message
    );
  }
};

module.exports = imageUploadAfterInsert;
