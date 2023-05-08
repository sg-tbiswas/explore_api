const RETS = require("node-rets");
const fs = require("fs");
const _ = require("lodash");
const feildsValues = require("./selected_feild.js");
const keyMapping = require("./name_change.js");
const image_list = require("./image_list.js");
const main_field = require("./main_field.js");
const addres_field = require("./addres_field.js");
const MongoClient = require("mongodb").MongoClient;
const CONSTANTS = require("./constants");
const os = require("os");

const client = RETS.initialize({
  loginUrl: "http://bright-rets.brightmls.com:6103/cornerstone/login",
  username: "3348441",
  password: "vUjeyasAmepri7eqehIPhifib",
  version: "RETS/1.8",
  userAgent: "Bright RETS Application/1.0",
  logLevel: "info",
});

const temp = fs.readFileSync("metaDataLookup.json");
const lookupValues = JSON.parse(temp);

const textReplace = (str) => {
  return str.split(" ").join("_");
};

const cpu_used = function () {
  const cpu = os.cpus();
  const totalIdle = 0;
  const totalTick = 0;
  const idle = 0;
  const tick = 0;

  for (const i = 0, len = cpu.length; i < len; i++) {
    const elem = cpu[i];
    for (type in elem.times) {
      totalTick += elem.times[type];
    }
    totalIdle += elem.times.idle;
  }

  idle = totalIdle / cpu.length;
  tick = totalTick / cpu.length;

  console.log(
    "CPU Usage from updation : " + (100 - ~~((100 * idle) / tick)) + "%"
  );
};

const recordUpdate = async () => {
  const now = new Date();

  const fortyFiveMinutesAgo = new Date(now.getTime() - 60 * 60000);
  const formattedTime = fortyFiveMinutesAgo.toISOString().slice(0, -1);
  const currentDate = new Date(now.getTime()).toISOString().slice(0, -1);
  console.log(formattedTime, currentDate);
  const temp = await client.search(
    "Property",
    "ALL",
    `(StandardStatus=|Active,Pending,Active Under Contract) AND (ModificationTimestamp=${formattedTime}+)`,

    {
      Select: feildsValues.join(","),
    }
  );
  let allRecords = [];

  if (temp.Objects && Array.isArray(temp.Objects)) {
    allRecords = allRecords.concat(temp.Objects);
    const recordsWithUpdatedFields = allRecords.map(mapRecord);
    if (recordsWithUpdatedFields && recordsWithUpdatedFields.length > 0) {
      let cnt = 1;
      for (const item of recordsWithUpdatedFields) {
        crossCheckRecords(item);
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
};
const mapRecord = (record, key) => {
  console.log(key);
  cpu_used();
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

const crossCheckRecords = async (result) => {
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

  newData.other_data.HOA_Fee = result?.other_data["HOA_Fee"]
    ? parseFloat(result?.other_data["HOA_Fee"])
    : 0;

  newData.other_data["Garage_YN"] = result?.other_data["Garage_YN"]
    ? result?.other_data["Garage_YN"]
    : "0";
  newData.other_data["Fireplace_YN"] = result?.other_data["Fireplace_YN"]
    ? result?.other_data["Fireplace_YN"]
    : "0";
  newData.other_data["Basement_YN"] = result?.other_data["Basement_YN"]
    ? result?.other_data["Basement_YN"]
    : "0";
  newData.other_data["Water_View_YN"] = result?.other_data["Water_View_YN"]
    ? result?.other_data["Water_View_YN"]
    : "0";
  newData.other_data["HOA_Y/N"] = result?.other_data["HOA_Y/N"]
    ? result?.other_data["HOA_Y/N"]
    : "0";

  newData.other_data["Condo/Coop_Association_Y/N"] = result?.other_data[
    "Condo/Coop_Association_Y/N"
  ]
    ? result?.other_data["Condo/Coop_Association_Y/N"]
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

  const client = new MongoClient(CONSTANTS.DB_CONNECTION_URI);
  try {
    await client.connect();
    const collection = client.db(CONSTANTS.DB_NAME).collection("propertyData");
    await collection.updateOne(
      { listing_id: result["listing_id"] },
      {
        $set: { ...newData },
      }
    );
  } catch (error) {
    console.log(error);
  }
};

module.exports = recordUpdate;
