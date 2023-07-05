const fs = require("fs");
const _ = require("lodash");
const feildsValues = require("./selected_feild.js");
const keyMapping = require("./name_change.js");
const main_field = require("./main_field.js");
const addres_field = require("./addres_field.js");
const MongoClient = require("mongodb").MongoClient;
const CONSTANTS = require("./constants");
const { RETS_CLIENT, getTodayDate } = require("./utils");
const imageUploadAfterInsert = require("./imageUploadAfterInsert.js");
const { exec } = require("child_process");

const temp = fs.readFileSync("metaDataLookup.json");
const lookupValues = JSON.parse(temp);

async function checkExistingRecord(data, client) {
  try {
    const collection = client.db(CONSTANTS.DB_NAME).collection("propertyData");
    const ddt = await collection
      .find({ listing_id: data.listing_id })
      .toArray();
    if (ddt) {
      return ddt;
    } else {
      return [];
    }
  } catch (error) {
    console.error(
      `error from checkExistingRecord: ${new Date().toUTCString()}`,
      error.message
    );
    return false;
  }
}
const textReplace = (str) => {
  return str.split(" ").join("_");
};

const fetchRecord = async (resource, className, keyMapping) => {
  try {
    const client = new MongoClient(CONSTANTS.DB_CONNECTION_URI);
    await client.connect();

    let allRecords = [];
    const now = new Date();
    console.log(now.toUTCString());

    console.log("Fetching records....");
    const records = await RETS_CLIENT.search(
      resource,
      className,
      `(ListingId=DCDC2102860)`,
      {
        Select: feildsValues.join(","),
      }
    );

    allRecords = allRecords.concat(records.Objects);

    count = parseInt(records.TotalCount);
    console.log("allRecords", allRecords.length);
    const recordsWithUpdatedFields = allRecords.map((record, key) => {
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

        // Check if the field name exists in keyMapping
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
              updatedRecord[field] = updatedFieldValues.join(",");
            }
          }
        }
      });
      return updatedRecord;
    });
    console.log(recordsWithUpdatedFields);
  } catch (err) {
    console.error(
      `Error occurred in fetchRecords function: ${new Date().toUTCString()} ${
        err.message
      }`
    );
    throw err;
  }
};

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

const fetchImagesWithListingId = async (id) => {
  try {
    const nodeClient = new MongoClient(CONSTANTS.DB_CONNECTION_URI);
    await nodeClient.connect();
    const query = await RETS_CLIENT.search(
      "Media",
      "PROP_MEDIA",
      `(ListingId=${id})`,
      {
        Select:
          "ListingId,MediaURL,MediaURLFull,MediaURLHD,MediaURLHiRes,MediaURLThumb,MediaURLMedium",
      }
    );
    let records = [];
    if (query.Objects && query.Objects.length > 0) {
      for (const obj of query.Objects) {
        const chkData = await checkExistingMediaURL(obj, nodeClient);
        if (!chkData) {
          continue;
        } else if (Array.isArray(chkData)) {
          if (chkData.length < 1) {
            records.push(obj);
          }
        }
      }
    }
    console.log("records>>>>", records);
  } catch (err) {
    console.error(
      `Error searching for ListingId ${id}: ${
        err.message
      } imageUpload() ${new Date().toUTCString()}`
    );
  }
};

const fetchRecordWithListingId = async () => {
  const Class = "Property";
  const Resource = "ALL";
  await fetchRecord(Class, Resource, keyMapping);
};

fetchRecordWithListingId();
//fetchImagesWithListingId("DCDC2102806");
