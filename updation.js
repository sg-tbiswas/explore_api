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

const textReplace = (str) => {
  return str.split(" ").join("_");
};

const recordUpdate = async (client) => {
  try {
    const now = new Date();

    const fortyFiveMinutesAgo = new Date(now.getTime() - 60 * 60000);

    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

    const formattedTime = threeHoursAgo.toISOString().slice(0, -1);
    const currentDate = new Date(now.getTime()).toISOString().slice(0, -1);
    console.log(formattedTime, currentDate);
    const temp = await RETS_CLIENT.search(
      "Property",
      "ALL",
      `(StandardStatus=|Active,Pending,Active Under Contract) AND (ModificationTimestamp=${formattedTime}+)`,

      {
        Select: feildsValues.join(","),
      }
    );
    let allRecords = [];
    count = parseInt(temp.TotalCount);
    console.log("UPT total", count);
    if (temp.Objects && Array.isArray(temp.Objects)) {
      allRecords = allRecords.concat(temp.Objects);
      const recordsWithUpdatedFields = allRecords.map(mapRecord);

      if (recordsWithUpdatedFields && recordsWithUpdatedFields.length > 0) {
        let cnt = 1;
        for (const item of recordsWithUpdatedFields) {
          await crossCheckRecords(item, client);
          cnt++;
        }
        console.log(`${cnt} recordUpdate Done!`);
        return true;
      } else {
        return true;
      }
    } else {
      return true;
    }
  } catch (error) {
    console.error(
      `Error occurred in recordUpdate function: ${new Date().toUTCString()} ${
        error.message
      }`
    );
    return true;
  }
};
const mapRecord = (record, key) => {
  console.log(`UPT -> ${key}`);
  const updatedRecord = {};
  const otherData = {};
  const addressData = {};
  const imageData = {};

  Object.keys(record).forEach((field) => {
    const fieldValues = record[field].split(",");
    const updatedFieldValues = fieldValues.map((value) => {
      const matchingLookup = lookupValues.find(
        (lookup) => lookup.MetadataEntryID === value.trim()
      );
      return matchingLookup ? matchingLookup.LongValue : value;
    });

    if (keyMapping.hasOwnProperty(field)) {
      otherData[keyMapping[field] || field] = updatedFieldValues.join(",");
    } else if (main_field.hasOwnProperty(field)) {
      updatedRecord[main_field[field]] = updatedFieldValues.join(",");
    } else if (addres_field.hasOwnProperty(field)) {
      addressData[addres_field[field]] = updatedFieldValues.join(",");
    } else if (image_list.hasOwnProperty(field)) {
      imageData[image_list[field]] = updatedFieldValues.join(",");
    } else {
      updatedRecord[field] = updatedFieldValues.join(",");
    }
  });

  if (Object.keys(otherData).length > 0) {
    updatedRecord["other_data"] = otherData;
  }
  if (Object.keys(addressData).length > 0) {
    updatedRecord["address"] = addressData;
  }
  if (Object.keys(imageData).length > 0) {
    updatedRecord["image"] = imageData;
  }

  return updatedRecord;
};

const crossCheckRecords = async (result, client) => {
  const newData = { ...result };

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

  try {
    const collection = client.db(CONSTANTS.DB_NAME).collection("propertyData");
    await collection.updateOne(
      { listing_id: result["listing_id"] },
      {
        $set: { ...newData },
      }
    );
  } catch (error) {
    console.error(
      `error while updating data from crossCheckRecords() ${new Date().toUTCString()}`,
      error
    );
  }
};

module.exports = recordUpdate;
