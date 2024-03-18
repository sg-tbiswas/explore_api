const fs = require("fs");
const _ = require("lodash");
const feildsValues = require("../selected_feild.js");
const keyMapping = require("../name_change.js");
const image_list = require("../image_list.js");
const main_field = require("../main_field.js");
const addres_field = require("../addres_field.js");
const CONSTANTS = require("../constants.js");
const { RETS_CLIENT } = require("../utils.js");
const dbConn = require("../dbConnection.js");

const temp = fs.readFileSync("../metaDataLookup.json");
const lookupValues = JSON.parse(temp);

const textReplace = (str) => {
  return str.split(" ").join("_");
};

const recordUpdate = async () => {
  try {
    const db = new dbConn();
    const client = await db.connect();
    try {
      const now = new Date();

      const fromDateTime = new Date(new Date("2023-08-29"));
      const formattedFromDateTime = fromDateTime.toISOString().slice(0, -1);

      const toDateTime = new Date(new Date("2023-10-08"));
      const formattedToDateTime = toDateTime.toISOString().slice(0, -1);

      const currentDate = new Date(now.getTime()).toISOString().slice(0, -1);

      //`(StandardStatus=|Pending) AND (MLSListDate=2023-08-01-2023-08-31)`
      console.log(formattedFromDateTime, formattedToDateTime);
      const temp = await RETS_CLIENT.search(
        "Property",
        "ALL",
        `(ListingId=DCDC2117926)`,
        {
          Select: feildsValues.join(","),
        }
      );
      let totalCount = parseInt(temp.TotalCount);
      console.log("totalCount>>>>", totalCount);
      let allRecords = [];

      if (temp.Objects && Array.isArray(temp.Objects)) {
        allRecords = allRecords.concat(temp.Objects);
        
        const recordsWithUpdatedFields = allRecords.map(mapRecord);
        console.log("allRecords", recordsWithUpdatedFields);
        if (recordsWithUpdatedFields && recordsWithUpdatedFields.length > 0) {
          let cnt = 1;
          let ucnt = 1;
          for (const item of recordsWithUpdatedFields) {
            try {
              await crossCheckRecords(item, client);
              ucnt++;
            } catch (error) {
              continue;
            }
            cnt++;
          }
          console.log(`${ucnt} recordUpdate done among ${cnt}!`);
        }
      }
      await db.disconnect();
    } catch (error) {
      console.error(
        `Error occurred in recordUpdate function: ${new Date().toUTCString()} ${
          error.message
        }`
      );
    } finally {
      await db.disconnect();
    }
  } catch (error) {
    console.error(error.message);
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
  const newData = { ...result };
  try {
    const renamed = _.mapKeys(newData.other_data, function (value, key) {
      return textReplace(key);
    });
    newData.other_data = renamed;

    newData.listing_price = result?.listing_price
      ? parseFloat(result.listing_price)
      : 0;
    newData.bedrooms = result?.bedrooms ? parseInt(result.bedrooms) : 0;
    newData.bathrooms = result?.bathrooms ? parseInt(result.bathrooms) : 0;
    newData.TaxTotalFinishedSqFt = result?.TaxTotalFinishedSqFt
      ? parseInt(result.TaxTotalFinishedSqFt)
      : 0;

    newData.other_data.DOM = result?.other_data?.DOM
      ? parseInt(result?.other_data?.DOM)
      : 0;

    newData.other_data.HOA_Fee = result?.other_data["HOA Fee"]
      ? parseFloat(result?.other_data["HOA Fee"])
      : 0;

    newData.other_data["Garage_YN"] = result?.other_data["Garage YN"]
      ? result?.other_data["Garage YN"]
      : "0";
    newData.other_data["Fireplace_YN"] = result?.other_data["Fireplace YN"]
      ? result?.other_data["Fireplace YN"]
      : "0";
    newData.other_data["Basement_YN"] = result?.other_data["Basement YN"]
      ? result?.other_data["Basement YN"]
      : "0";
    newData.other_data["Water_View_YN"] = result?.other_data["Water View YN"]
      ? result?.other_data["Water View YN"]
      : "0";
    newData.other_data["HOA_Y/N"] = result?.other_data["HOA Y/N"]
      ? result?.other_data["HOA Y/N"]
      : "0";

    newData.other_data["Condo/Coop_Association_Y/N"] = result?.other_data[
      "Condo/Coop Association Y/N"
    ]
      ? result?.other_data["Condo/Coop Association Y/N"]
      : "0";

    const place1 = [];
    if (newData?.address?.street_number) {
      place1.push(newData?.address?.street_number);
    }
    if (newData?.address?.street) {
      place1.push(newData?.address?.street);
    }
    if (newData?.address?.street_suffix) {
      place1.push(newData?.address?.street_suffix);
    }
    if (newData?.address?.street_dir_suffix) {
      place1.push(newData?.address?.street_dir_suffix);
    }
    if (newData?.address?.street_dir_prefix) {
      place1.push(newData?.address?.street_dir_prefix);
    }
    const addrPart1 = place1.join(" ");
    const addrArr = [];
    let zippart;
    if (newData?.address?.city) {
      addrArr.push(newData?.address?.city);
    }
    if (newData?.other_data?.state) {
      addrArr.push(newData?.other_data?.state);
    }
    if (newData?.other_data?.zipcode) {
      zippart = newData?.other_data?.zipcode;
    }
    const addrPart2 = addrArr.join(", ");
    const twoPartAddr = addrPart1.concat(", ", addrPart2);
    const fullAddr = twoPartAddr.concat(" ", zippart);
    // CODE TO GENERATE FULL ADDRESS

    const fullBathrooms =
      newData.bathrooms +
      (newData?.other_data?.half_bathrooms
        ? parseInt(newData?.other_data?.half_bathrooms)
        : 0);

    newData.address.fullAddress = fullAddr;
    newData.fullBathrooms = fullBathrooms;

    const propertyCollection = client.db(CONSTANTS.DB_NAME).collection("propertyData");
    const ddt = await propertyCollection.findOne({ listing_id: result["listing_id"] });
    if (ddt) {
      if (
        !ddt.new_listing_price &&
        ddt.listing_price == parseFloat(result.listing_price)
      ) {
        newData.listing_price = parseFloat(result.listing_price);
      } else if (
        !ddt.new_listing_price &&
        ddt.listing_price != parseFloat(result.listing_price)
      ) {
        newData.listing_price = ddt.listing_price;
        newData.new_listing_price = result?.listing_price
          ? parseFloat(result.listing_price)
          : 0;
      } else if (
        ddt.new_listing_price &&
        ddt.new_listing_price == parseFloat(result.listing_price)
      ) {
        newData.listing_price = ddt.listing_price;
        newData.new_listing_price = ddt.new_listing_price;
      } else if (
        ddt.new_listing_price &&
        ddt.new_listing_price != parseFloat(result.listing_price)
      ) {
        newData.listing_price = ddt.new_listing_price;
        newData.new_listing_price = result?.listing_price
          ? parseFloat(result.listing_price)
          : 0;
      }
    }

    try {
      const collection = client
        .db(CONSTANTS.DB_NAME)
        .collection("propertyData");
      await collection.updateOne(
        { listing_id: result["listing_id"] },
        {
          $set: { ...newData },
        }
      );
    } catch (error) {
      console.error(
        `error while updating data from crossCheckRecords()`,
        error
      );
    }
  } catch (error) {
    console.error(`error while getting and updating data from DB`, error);
  }
};

recordUpdate();