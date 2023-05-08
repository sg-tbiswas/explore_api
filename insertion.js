const RETS = require("node-rets");
const fs = require("fs");
const _ = require("lodash");
const feildsValues = require("./selected_feild.js");
const keyMapping = require("./name_change.js");
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

async function addRecordsToMongoDB(records, className) {
  const client = new MongoClient(CONSTANTS.DB_CONNECTION_URI);
  try {
    await client.connect();

    const collection = client.db(CONSTANTS.DB_NAME).collection("propertyData");
    await collection.insertMany(records, (err, res) => {
      if (err) throw err;
      console.log(`${res.insertedCount} documents inserted`);
      client.close();
    });
  } catch (e) {
    console.error("error from addRecordsToMongoDB", e);
  } finally {
    await client.close();
  }
}

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
    "CPU Usage from insertion: " + (100 - ~~((100 * idle) / tick)) + "%"
  );
};

async function checkExistingRecord(data) {
  const client = new MongoClient(CONSTANTS.DB_CONNECTION_URI);
  try {
    await client.connect();
    const collection = client.db(CONSTANTS.DB_NAME).collection("propertyData");
    const ddt = await collection
      .find({ listing_id: data.listing_id })
      .toArray();
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
const textReplace = (str) => {
  return str.split(" ").join("_");
};

const fetchRecords = async (resource, className, keyMapping) => {
  try {
    let allRecords = [];
    let offset = 1;
    let count;
    const now = new Date();
    console.log(now);

    // Subtract 45 minutes from the current datetime
    const fortyFiveMinutesAgo = new Date(now.getTime() - 45 * 60000);

    // Format the datetime string without the timezone indicator
    const formattedTime = fortyFiveMinutesAgo.toISOString().slice(0, -1);
    function getTodayDate() {
      const today = new Date();
      const year = today.getFullYear();
      const month = (today.getMonth() + 1).toString().padStart(2, "0");
      const day = today.getDate().toString().padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    do {
      const records = await client.search(
        resource,
        className,
        `(StandardStatus=|Active,Pending,Active Under Contract) AND (MLSListDate=${getTodayDate()}) AND (ModificationTimestamp=${formattedTime}+)`,
        {
          limit: 500,
          offset,
          Select: feildsValues.join(","),
        }
      );

      allRecords = allRecords.concat(records.Objects);

      count = parseInt(records.TotalCount);

      offset += 500;
      console.log(count, offset);
    } while (offset < count);
    console.log("allRecords", allRecords.length);

    const recordsWithUpdatedFields = allRecords.map((record, key) => {
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

      data.other_data.HOA_Fee = result?.other_data["HOA_Fee"]
        ? parseFloat(result?.other_data["HOA_Fee"])
        : 0;

      data.other_data["Garage_YN"] = result?.other_data["Garage_YN"]
        ? result?.other_data["Garage_YN"]
        : "0";
      data.other_data["Fireplace_YN"] = result?.other_data["Fireplace_YN"]
        ? result?.other_data["Fireplace_YN"]
        : "0";
      data.other_data["Basement_YN"] = result?.other_data["Basement_YN"]
        ? result?.other_data["Basement_YN"]
        : "0";
      data.other_data["Water_View_YN"] = result?.other_data["Water_View_YN"]
        ? result?.other_data["Water_View_YN"]
        : "0";
      data.other_data["HOA_Y/N"] = result?.other_data["HOA_Y/N"]
        ? result?.other_data["HOA_Y/N"]
        : "0";

      data.other_data["Condo/Coop_Association_Y/N"] = result?.other_data[
        "Condo/Coop_Association_Y/N"
      ]
        ? result?.other_data["Condo/Coop_Association_Y/N"]
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
      const chkData = await checkExistingRecord(data);
      if (!chkData) {
        updatedRecords.push(data);
      }
    }
    if (updatedRecords.length > 0) {
      await addRecordsToMongoDB(updatedRecords, className);
      const listingIds = updatedRecords.map((obj) => obj.listing_id);
      return listingIds;
    } else {
      return [];
    }
  } catch (err) {
    console.error(`Error occurred in fetchRecords function: ${err.message}`);
    throw err;
  }
};

const gobyHomes = async () => {
  try {
    const loginResponse = await client.login();
    if (loginResponse) {
      console.log("Successfully logged in to server");
    } else {
      console.log("There was an error connecting to the server");
      return;
    }

    const Class = "Property";
    const Resource = "ALL";
    const records = await fetchRecords(Class, Resource, keyMapping);

    console.log("All records fetched and written successfully!");
    client.logout();
    return records;
  } catch (err) {
    console.error(`Error occurred in gobyHomes function: ${err.message}`);
    return false;
  }
};

module.exports = gobyHomes;
