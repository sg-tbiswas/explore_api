const fs = require("fs");
const _ = require("lodash");
const feildsValues = require("../selected_feild.js");
const keyMapping = require("../name_change.js");
const main_field = require("../main_field.js");
const addres_field = require("../addres_field.js");
const MongoClient = require("mongodb").MongoClient;
const CONSTANTS = require("../constants.js");
const { RETS_CLIENT, getTodayDate } = require("../utils.js");
const imageUploadAfterInsert = require("../imageUploadAfterInsert.js");
const { exec } = require("child_process");
const dbConn = require("../dbConnection.js");

const temp = fs.readFileSync("../metaDataLookup.json");
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

const fetchRecord = async (resource, className, keyMapping, client) => {
  try {
    let allRecords = [];
    const now = new Date();
    console.log(now.toUTCString());

    console.log("Fetching records....");
    const records = await RETS_CLIENT.search(
      resource,
      className,
      `(ListingId=DCDC2108186)`,
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
    const result = recordsWithUpdatedFields[0];
    console.log("result>>>>", result)
    //await updateSingleListing(result, client);
  } catch (err) {
    console.error(
      `Error occurred in fetchRecords function: ${new Date().toUTCString()} ${
        err.message
      }`
    );
    throw err;
  }
};

const updateSingleListing = async (result, client) => {
  try {
    const collection = client.db(CONSTANTS.DB_NAME).collection("propertyData");
    await collection.updateOne(
      { listing_id: result["listing_id"] },
      {
        $set: { ...result },
      }
    );
  } catch (error) {
    console.error(
      `error while updating data from crossCheckRecords() ${new Date().toUTCString()}`,
      error
    );
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
    const db = new dbConn();
    const client = await db.connect();
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
      let records = [];
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
      console.log("records>>>>", records);
    } catch (err) {
      console.error(
        `Error searching for ListingId ${id}: ${
          err.message
        } imageUpload() ${new Date().toUTCString()}`
      );
    } finally {
      await db.disconnect();
    }
  } catch (error) {
    console.log("DB connection error!", error.message);
  }
};

const fetchRecordWithListingId = async () => {
  const Class = "Property";
  const Resource = "ALL";

  try {
    const db = new dbConn();
    const client = await db.connect();
    try {
      await fetchRecord(Class, Resource, keyMapping, client);
    } catch (error) {
      console.error(
        `${err.message} from
        } fetchRecordWithListingId() ${new Date().toUTCString()}`
      );
    } finally {
      await db.disconnect();
    }
  } catch (error) {}
};

fetchRecordWithListingId();
//fetchImagesWithListingId("DCDC2102806");
