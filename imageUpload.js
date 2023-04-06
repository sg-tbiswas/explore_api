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

const imageUpload = async () => {
  const listingChunks = await getListingIds();
  let records = [];

  for (let j = 0; j < listingChunks.length; j++) {
    const id = listingChunks[j];
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
        for (let k = 0; k < query.Objects.length; k++) {
          const record = query.Objects[k];
          records.push(record);
        }
      }
    } catch (err) {
      console.error(`Error searching for ListingId ${id}: ${err.message}`);
      continue; // Skip to next iteration of the loop
    }
  }

  await addRecordsToMongoDBImage(records);
};

const getListingIds = async () => {
  try {
    const now = new Date();

    // Subtract 45 minutes from the current datetime
    const fortyFiveMinutesAgo = new Date(now.getTime() - 45 * 60000);

    // Format the datetime string without the timezone indicator
    const formattedTime = fortyFiveMinutesAgo.toISOString().slice(0, -1);
    const currentDate = new Date(now.getTime()).toISOString().slice(0, -1);

    function getTodayDate() {
      const today = new Date();
      const year = today.getFullYear();
      const month = (today.getMonth() + 1).toString().padStart(2, "0");
      const day = today.getDate().toString().padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    const listingIdData = await client.search(
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
  }
};

const addRecordsToMongoDBImage = async (records) => {
  const client = new MongoClient(CONSTANTS.DB_CONNECTION_URI);
  try {
    await client.connect();
    const collection = client.db(CONSTANTS.DB_NAME).collection("pImagesTest");
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

  // const connect = client.db(CONSTANTS.DB_NAME);
  // const collection = connect.collection("propertyDataImages");
  //   await collection.find().forEach(async function (obj) {
  //       await collection.updateOne(
  //         { _id: obj._id },
  //         {
  //           $unset: { __key__: "", __error__: "", __has_error__: "" },
  //         }
  //       );
  //     });
  //     console.log("update done");
};

// imageUpload();
module.exports = imageUpload;
