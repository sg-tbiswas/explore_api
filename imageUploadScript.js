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
    const nodeClient = new MongoClient(CONSTANTS.DB_CONNECTION_URI);
    await nodeClient.connect();

    //const listingChunks = ["DCDC2102806"];
    const listingChunks = await getListingIds();
    console.log("listingChunks>>", listingChunks);

    if (listingChunks && listingChunks.length > 0) {
      let gcn = 0;
      let pcnt = 0;
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
              let records = [];
              for (const obj of query.Objects) {
                const chkData = await checkExistingMediaURL(obj, nodeClient);
                if (!chkData) {
                  continue;
                } else if (Array.isArray(chkData)) {
                  if (chkData.length < 1) {
                    records.push(obj);
                    gcn++;
                  }
                }
              }
              if (records.length > 0) {
                await addRecordsToMongoDBImage(records, nodeClient);
              } else {
                console.log("No images available to add! imageUpload()");
              }
            }
            console.log(
              "All images fetched and added successfully! imageUpload()"
            );
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
      console.log(`${gcn} image added`);
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
    const listingIdData = await RETS_CLIENT.search(
      "Property",
      "ALL",
      `(StandardStatus=|Active,Pending,Active Under Contract) AND (MLSListDate=2023-06-25+)`,
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
    console.error(`error occur ${new Date().toUTCString()}`, e.message);
  } finally {
    await client.close();
  }
};

imageUpload();
