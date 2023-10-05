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

const imageUploadAfterInsert = async (listingChunks, client) => {
  try {
    const loginResponse = await RETS_CLIENT.login();
    if (loginResponse) {
      console.log("Successfully logged in to server");
    } else {
      console.error("There was an error connecting to the server");
      return;
    }
    if (listingChunks) {
      const allRecords = [];
      const newRecords = [];

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
              allRecords.push(...query.Objects);
            }

          } catch (err) {
            console.error(
              `Error searching for ListingId ${id}: ${err.message} from imageUploadAfterInsert()`
            );
            continue; // Skip to next iteration of the loop
          }
        }
      }

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
      await RETS_CLIENT.logout();
      // await client.close();
      console.log(
        `All images fetched and added successfully! imageUploadAfterInsert()`
      );
    }
    await RETS_CLIENT.logout();
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
    });
  } catch (error) {
    console.error(
      `error occurred add record to DBImage ${new Date().toUTCString()}`,
      error.message
    );
  }
};
module.exports = imageUploadAfterInsert;
