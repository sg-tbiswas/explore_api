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

async function addRecordsToMongoDB(records, client) {
  try {
    const collection = client.db(CONSTANTS.DB_NAME).collection("propertyData");
    const result = await collection.insertMany(records);
    console.log(`${result.insertedCount} documents inserted`);
  } catch (error) {
    console.error("Error from addRecordsToMongoDB:", error.message);
  }
}

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

const fetchRecords = async (resource, className, keyMapping, client) => {
  try {
    let allRecords = [];
    let offset = 1;
    let count;
    const now = new Date();

    //`(StandardStatus=|Active,Pending,Active Under Contract) AND (ModificationTimestamp=${newFormattedTime}+)`,

    // Subtract 3 hours from the current datetime
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const newFormattedTime = sixHoursAgo.toISOString().slice(0, -1);

    console.log(newFormattedTime);
    console.log("Fetching records....");
    const records = await RETS_CLIENT.search(
      resource,
      className,
      `(StandardStatus=|Active,Pending,Active Under Contract)  AND (MLSListDate=2023-09-22+)`,
      {
        Select: feildsValues.join(","),
      }
    );

    count = parseInt(records.TotalCount);
    console.log("allRecords", count);
    allRecords = records.Objects ? allRecords.concat(records.Objects) : [];

    const recordsWithUpdatedFields = allRecords.map((record, key) => {
      console.log(`In -> ${key}`);
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
    // console.log(recordsWithUpdatedFields, className);

    const updatedRecords = [];
    const allListings = [];
    for (const result of recordsWithUpdatedFields) {
      let data = result;

      const renamed = _.mapKeys(data.other_data, function (value, key) {
        return textReplace(key);
      });
      data.other_data = renamed;

      data.listing_price = result?.listing_price
        ? parseFloat(result.listing_price)
        : 0;
      data.bedrooms = result?.bedrooms ? parseInt(result.bedrooms) : 0;
      data.bathrooms = result?.bathrooms ? parseInt(result.bathrooms) : 0;
      data.TaxTotalFinishedSqFt = result?.TaxTotalFinishedSqFt
        ? parseInt(result.TaxTotalFinishedSqFt)
        : 0;

      data.other_data.DOM = result?.other_data?.DOM
        ? parseInt(result?.other_data?.DOM)
        : 0;

      data.other_data.HOA_Fee = result?.other_data["HOA Fee"]
        ? parseFloat(result?.other_data["HOA Fee"])
        : 0;

      data.other_data["Garage_YN"] = result?.other_data["Garage YN"]
        ? result?.other_data["Garage YN"]
        : "0";
      data.other_data["Fireplace_YN"] = result?.other_data["Fireplace YN"]
        ? result?.other_data["Fireplace YN"]
        : "0";
      data.other_data["Basement_YN"] = result?.other_data["Basement YN"]
        ? result?.other_data["Basement YN"]
        : "0";
      data.other_data["Water_View_YN"] = result?.other_data["Water View YN"]
        ? result?.other_data["Water View YN"]
        : "0";
      data.other_data["HOA_Y/N"] = result?.other_data["HOA Y/N"]
        ? result?.other_data["HOA Y/N"]
        : "0";

      data.other_data["Condo/Coop_Association_Y/N"] = result?.other_data[
        "Condo/Coop Association Y/N"
      ]
        ? result?.other_data["Condo/Coop Association Y/N"]
        : "0";

      const place1 = [];
      if (data?.address?.street_number) {
        place1.push(data?.address?.street_number);
      }
      if (data?.address?.street) {
        place1.push(data?.address?.street);
      }
      if (data?.address?.street_suffix) {
        place1.push(data?.address?.street_suffix);
      }
      if (data?.address?.street_dir_suffix) {
        place1.push(data?.address?.street_dir_suffix);
      }
      if (data?.address?.street_dir_prefix) {
        place1.push(data?.address?.street_dir_prefix);
      }
      const addrPart1 = place1.join(" ");
      const addrArr = [];
      let zippart;
      if (data?.address?.city) {
        addrArr.push(data?.address?.city);
      }
      if (data?.other_data?.state) {
        addrArr.push(data?.other_data?.state);
      }
      if (data?.other_data?.zipcode) {
        zippart = data?.other_data?.zipcode;
      }
      const addrPart2 = addrArr.join(", ");
      const twoPartAddr = addrPart1.concat(", ", addrPart2);
      const fullAddr = twoPartAddr.concat(" ", zippart);
      // CODE TO GENERATE FULL ADDRESS

      const fullBathrooms =
        data.bathrooms +
        (data?.other_data?.half_bathrooms
          ? parseInt(data?.other_data?.half_bathrooms)
          : 0);

      data.address.fullAddress = fullAddr;
      data.fullBathrooms = fullBathrooms;

      const chkData = await checkExistingRecord(data, client);
      allListings.push(data);
      if (!chkData) {
        continue;
      } else if (Array.isArray(chkData)) {
        if (chkData.length < 1) {
          updatedRecords.push(data);
        }
      }
    }
    if (updatedRecords.length > 0) {
      await addRecordsToMongoDB(updatedRecords, client);
      const listingIds = allListings.map((obj) => obj.listing_id);
      return listingIds;
    } else {
      return [];
    }
  } catch (err) {
    console.error(
      `Error occurred in fetchRecords function: ${new Date().toUTCString()} ${
        err.message
      }`
    );
    throw err;
  }
};

async function gobyHomes() {
  try {
    const db = new dbConn();
    const client = await db.connect();
    try {
      const loginResponse = await RETS_CLIENT.login();
      if (!loginResponse) {
        console.log("There was an error connecting to the server");
        return;
      }

      const Class = "Property";
      const Resource = "ALL";
      const records = await fetchRecords(Class, Resource, keyMapping, client);
      await imageUploadAfterInsert(records, client);
      console.log("All records fetched and written successfully!");
      await client.close();
      await RETS_CLIENT.logout();
    } catch (err) {
      console.error("Error occurred in gobyHomes function:", err.message);
    } finally {
      await db.disconnect();
    }
  } catch (error) {
    console.log("DB connection error", error.message);
  }
}

// module.exports = gobyHomes;
gobyHomes();
