const RETS = require("node-rets");
const fs = require("fs");
const MongoClient = require("mongodb").MongoClient;
const CONSTANTS = require("./constants");

const client = RETS.initialize({
  loginUrl: "http://bright-rets.brightmls.com:6103/cornerstone/login",
  username: "3348441",
  password: "vUjeyasAmepri7eqehIPhifib",
  version: "RETS/1.8",
  userAgent: "Bright RETS Application/1.0",
  logLevel: "info",
});

async function checkExistingRecord(data) {
  const client = new MongoClient(CONSTANTS.DB_CONNECTION_URI);
  try {
    await client.connect();
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
    console.error("error from checkExistingRecord imageUploadAfterInsert()", e);
    return false;
  }
}

const imageUploadAfterInsert = async () => {
  const listingChunks = [
    "DCDC2093888",
    "DCDC2094896",
    "DCDC2094706",
    "DCDC2094568",
    "DCDC2093676",
    "DCDC2094442",
    "DCDC2092906",
    "DCDC2093544",
    "DCDC2094434",
    "DCDC2094198",
    "DCDC2094484",
    "DCDC2093358",
    "DCDC2093438",
    "DCDC2094550",
    "DCDC2093576",
    "DCDC2093130",
    "DCDC2092496",
    "DCDC2094464",
    "DCDC2094268",
    "DCDC2092264",
    "DCDC2093686",
    "DCDC2092244",
    "DCDC2093378",
    "DCDC2094770",
    "DCDC2094852",
    "DCDC2094854",
    "DCDC2093848",
    "DCDC2081616",
    "DCDC2093958",
    "DCDC2094846",
  ];
  if (listingChunks) {
    let records = [];

    for (let j = 0; j < listingChunks.length; j++) {
      const id = listingChunks[j];
      if (id) {
        try {
          const query = await client.search(
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
              const chkData = await checkExistingRecord(obj);
              if (!chkData) {
                records.push(obj);
              }
              //records.push(obj);
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
      await addRecordsToMongoDBImage(records);
      console.log(
        "All images fetched and added successfully! imageUploadAfterInsert()"
      );
    } else {
      console.log("No images available to add! imageUploadAfterInsert()");
    }
    return true;
  } else {
    return true;
  }
};

const addRecordsToMongoDBImage = async (records) => {
  const client = new MongoClient(CONSTANTS.DB_CONNECTION_URI);
  try {
    await client.connect();
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
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
};

imageUploadAfterInsert();
// module.exports = imageUploadAfterInsert;
