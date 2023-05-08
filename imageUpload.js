const RETS = require("node-rets");
const fs = require("fs");
const MongoClient = require("mongodb").MongoClient;
const CONSTANTS = require("./constants");
var os = require("os");

const client = RETS.initialize({
  loginUrl: "http://bright-rets.brightmls.com:6103/cornerstone/login",
  username: "3348441",
  password: "vUjeyasAmepri7eqehIPhifib",
  version: "RETS/1.8",
  userAgent: "Bright RETS Application/1.0",
  logLevel: "info",
});

function cpu_used() {
  let cpu = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;
  let idle = 0;
  let tick = 0;

  for (let i = 0, len = cpu.length; i < len; i++) {
    let elem = cpu[i];
    for (type in elem.times) {
      totalTick += elem.times[type];
    }
    totalIdle += elem.times.idle;
  }

  idle = totalIdle / cpu.length;
  tick = totalTick / cpu.length;

  console.log(
    "CPU Usage from insertion: " + (100 - ~~((100 * idle) / tick)) + "%"
  );
}

async function checkExistingMediaURL(data) {
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
    console.error("error from checkExistingRecord", e);
    return false;
  }
}

const imageUpload = async () => {
  const listingChunks = await getListingIds();
  if (listingChunks && listingChunks.length > 0) {
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
              const chkData = await checkExistingMediaURL(obj);
              cpu_used();
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
      await addRecordsToMongoDBImage(records);
      console.log("All images fetched and added successfully! imageUpload()");
    } else {
      console.log("No images available to add! imageUpload()");
    }
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
    return false;
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
