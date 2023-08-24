const fs = require("fs");
const _ = require("lodash");
const feildsValues = require("../selected_feild.js");
const keyMapping = require("../name_change.js");
const image_list = require("../image_list.js");
const main_field = require("../main_field.js");
const addres_field = require("../addres_field.js");
const MongoClient = require("mongodb").MongoClient;
const CONSTANTS = require("../constants.js");
const { RETS_CLIENT } = require("../utils.js");

const temp = fs.readFileSync("metaDataLookup.json");
const lookupValues = JSON.parse(temp);

const dataUpdate = async () => {
  let propertyDataCollectionData;
  try {
    const client = new MongoClient(CONSTANTS.DB_CONNECTION_URI);
    await client.connect();
    const propertyDataCollection = client
      .db(CONSTANTS.DB_NAME)
      .collection("propertyData");
    propertyDataCollectionData = await propertyDataCollection
      .find({
        status: { $eq: "Active" },
      })
      .skip(40000)
      .limit(20000)
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
        icnt++;
        const chkData = await compareWithRets(listing.listing_id);
        console.log("temp", chkData, "totalCount>>", icnt);
      } catch (error) {
        console.log(
          `Error occurred in compare with RETS client: ${error.message}, ListingID:${listing.listing_id}`
        );
        dcnt++;
        const client = new MongoClient(CONSTANTS.DB_CONNECTION_URI);
        const propertyDataCollection = client
          .db(CONSTANTS.DB_NAME)
          .collection("propertyData");
        await propertyDataCollection.deleteOne({
          listing_id: listing.listing_id,
        });
        console.log("deleteCount>>", dcnt);
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

const mapRecord = (record, key) => {
  console.log(key);
  const updatedRecord = {};
  Object.keys(record).forEach((field) => {
    const fieldValues = record[field].split(",");
    const updatedFieldValues = fieldValues.map((value) => {
      const matchingLookup = lookupValues.find(
        (lookup) => lookup.MetadataEntryID === value.trim()
      );
      if (matchingLookup) {
        return matchingLookup.LongValue;
      }

      return value;
    });
    if (keyMapping.hasOwnProperty(field)) {
      if (!updatedRecord.hasOwnProperty("other_data")) {
        updatedRecord["other_data"] = {};
      }
      const newField = keyMapping[field] || field;
      updatedRecord["other_data"][newField] = updatedFieldValues.join(",");
    } else {
      // Check if the field name exists in the main_field
      if (main_field.hasOwnProperty(field)) {
        // If it exists in main_field's key, use the value as the new field name
        const newField = main_field[field];
        updatedRecord[newField] = updatedFieldValues.join(",");
      } else {
        // Check if the field name exists in address_field
        if (addres_field.hasOwnProperty(field)) {
          // If it exists in address_field's key, add it to the array of addresses in updatedRecord
          if (!updatedRecord.hasOwnProperty("address")) {
            updatedRecord["address"] = {};
          }
          const newField = addres_field[field];
          updatedRecord["address"][newField] = updatedFieldValues.join(",");
        } else {
          if (image_list.hasOwnProperty(field)) {
            if (!updatedRecord.hasOwnProperty("image")) {
              updatedRecord["image"] = {};
            }
            const newField = image_list[field];
            updatedRecord["image"][newField] = updatedFieldValues.join(",");
          } else {
            // None of the above, use the field name as is
            updatedRecord[field] = updatedFieldValues.join(",");
          }
        }
      }
    }
  });
  return updatedRecord;
};

dataUpdate();
