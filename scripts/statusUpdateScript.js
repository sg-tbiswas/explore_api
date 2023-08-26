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

const temp = fs.readFileSync("../metaDataLookup.json");
const lookupValues = JSON.parse(temp);

const statusUpdate = async () => {
  try {
    const client = new MongoClient(CONSTANTS.DB_CONNECTION_URI);
    await client.connect();
    const now = new Date();
    const fromDateTime = new Date(new Date("2023-08-24"));
    const formattedFromDateTime = fromDateTime.toISOString().slice(0, -1);

    const toDateTime = new Date(new Date("2023-08-25"));
    const formattedToDateTime = toDateTime.toISOString().slice(0, -1);

    const currentDate = new Date(now.getTime()).toISOString().slice(0, -1);
    console.log(formattedFromDateTime,"  ", formattedToDateTime);

    const temp = await RETS_CLIENT.search(
      "Property",
      "ALL",
      `~(StandardStatus=|Active,Pending,Active Under Contract) AND (ModificationTimestamp=${formattedFromDateTime}-${formattedToDateTime})`,
      { Select: feildsValues.join(",") }
    );
    let allRecords = [];

    let totalCount = parseInt(temp.TotalCount);
    console.log("totalCount>>>>",totalCount)

    if (temp.Objects && Array.isArray(temp.Objects)) {
      allRecords = allRecords.concat(temp.Objects);
      console.log(
        "getting formated record",
        new Date(now.getTime()).toUTCString()
      );
      const recordsWithUpdatedFields = allRecords.map(mapRecord);

      if (recordsWithUpdatedFields && recordsWithUpdatedFields.length > 0) {
        let cnt = 1;
        for (const item of recordsWithUpdatedFields) {
          await crossCheckRecords(item, client);
          cnt++;
        }
        console.log(`${cnt} statusUpdate Done!`);
      }
    }
    return true;
  } catch (error) {
    console.error(
      `Error occurred in statusUpdate function: ${new Date().toUTCString()} ${
        error.message
      }`
    );
    return true;
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

const crossCheckRecords = async (result, client) => {
  try {
    const collection = client.db(CONSTANTS.DB_NAME).collection("propertyData");

    const imageCollection = client
      .db(CONSTANTS.DB_NAME)
      .collection("propertyDataImages");

    if (result["status"] == "Closed") {
      await collection.deleteOne({
        listing_id: result["listing_id"],
      });
      await imageCollection.deleteMany({
        ListingId: result["listing_id"],
      });
    } else {
      await collection.updateOne(
        { listing_id: result["listing_id"] },
        {
          $set: { status: result["status"] },
        }
      );
    }
  } catch (error) {
    console.error(
      `error while updating data from crossCheckRecords() ${new Date().toUTCString()}`,
      error
    );
  }
};

statusUpdate();
