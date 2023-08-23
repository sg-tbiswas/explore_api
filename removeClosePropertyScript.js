const fs = require("fs");
const _ = require("lodash");
const feildsValues = require("./selected_feild.js");
const keyMapping = require("./name_change.js");
const image_list = require("./image_list.js");
const main_field = require("./main_field.js");
const addres_field = require("./addres_field.js");
const MongoClient = require("mongodb").MongoClient;
const CONSTANTS = require("./constants.js");
const { RETS_CLIENT } = require("./utils.js");

const temp = fs.readFileSync("metaDataLookup.json");
const lookupValues = JSON.parse(temp);

const removeData = async () => {
  let propertyDataCollectionData;
  try {
    const client = new MongoClient(CONSTANTS.DB_CONNECTION_URI);
    await client.connect();
    const propertyDataCollection = client
      .db(CONSTANTS.DB_NAME)
      .collection("propertyData");
    propertyDataCollectionData = await propertyDataCollection
      .find({
        status: { $eq: "Closed" },
      })
      .skip(0)
      .limit(5000)
      .toArray();
  } catch (error) {
    console.error(
      `Error occurred in data fetching from mongodb: ${error.message}`
    );
    return true;
  }

  if (propertyDataCollectionData && propertyDataCollectionData.length > 0) {
    let dcnt = 0;
    let icnt = 0;
    for (const listing of propertyDataCollectionData) {
      try {
        dcnt++;
        const client = new MongoClient(CONSTANTS.DB_CONNECTION_URI);
        const propertyDataCollection = client
          .db(CONSTANTS.DB_NAME)
          .collection("propertyData");
        const propertyDataImageCollection = client
          .db(CONSTANTS.DB_NAME)
          .collection("propertyDataImages");
        await propertyDataCollection.deleteOne({
          listing_id: listing.listing_id,
        });
        await propertyDataImageCollection.deleteMany({
          ListingId: listing.listing_id,
        });
        console.log("deleteCount>>", dcnt);


      } catch (error) {
        console.log(
          `Error occurred in compare with RETS client: ${error.message}, ListingID:${listing.listing_id}`
        );
        continue;
      }
    }
    console.log("deleteCount>>", dcnt);
  }
};

const compareWithRets = async (listing_id) => {
  const temp = await RETS_CLIENT.search(
    "Property",
    "ALL",
    `(StandardStatus=|Active) AND (ListingId=${listing_id})`,
    { Select: feildsValues.join(",") }
  );
  let allRecords = [];
  if (temp.Objects && Array.isArray(temp.Objects)) {
    return temp.Objects[0]?.ListingId;
  } else {
    return {};
  }
};

removeData();
