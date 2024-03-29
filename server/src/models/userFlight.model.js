const userFlightDatabase = require("./userFlight.mongo");
const searchFlights = require("../puppeteer/bundle/firstTimeSearch");
const dayjs = require("dayjs");
const { find } = require("./userFlight.mongo");

// Get all documents
const getAllDocuments = async () => {
  return await userFlightDatabase.find({});
};

const getAllReferences = async () => {
  const documents = await userFlightDatabase.find({});
  const references = documents.map((doc) => doc.ref);
  return references;
};

const getAllEmails = async () => {
  const documents = await userFlightDatabase.find({}).lean();
  return (emails = documents.map((doc) => doc.user.email));
};

const checkIfFlightTimeForScan = async () => {
  console.log(`checkIfFlightTimeForScan Fired`);
  // Next Scan adds 43200000ms to the last scan. If the current time is over this, then we want to scan
  // return await userFlightDatabase.find({$or : [ {isBeingScanned: false},{nextScan: 0}, {nextScan: {$lt: new Date().getTime() }}]});
  return await userFlightDatabase.findOne({
    $or: [
      { $and: [{ isBeingScanned: false }, { nextScan: 0 }] },
      {
        $and: [
          { isBeingScanned: false },
          { nextScan: { $lt: new Date().getTime() } },
        ],
      },
    ],
  });
};

const createUser = async (userObject) => {
  console.log(userObject);
  userObject.dates.departureDateString = dayjs(
    userObject.dates.departureDate
  ).format("dddd DD MMMM YYYY");
  userObject.dates.returnDateString = dayjs(userObject.dates.returnDate).format(
    "dddd DD MMMM YYYY"
  );
  const user = await userFlightDatabase.create(userObject);
  return user._id ? true : false;
};

const updateUserByReference = async (reference) => {
  console.log("Fired updateUserByReference");
  console.log(`Reference is ${reference}`);
  const flightUser = await getUserFlightByReference(reference);
  console.log("Flight User found");
  // flightUser.dates.departureDateString = dayjs(
  //   flightUser.dates.departureDate
  // ).format("dddd DD MMMM YYYY");
  // flightUser.dates.returnDateString = dayjs(flightUser.dates.returnDate).format(
  //   "dddd DD MMMM YYYY"
  // );
  // console.log(flightUser.dates.returnDateString);
  // await flightUser.save();
  // return flightUser.dates.departureDateString &&
  //   flightUser.dates.returnDateString
  //   ? true
  //   : false;
};

const userTest = () => {
  return { test: "This is a test" };
};

const getUserFlightByReference = async (reference) => {
  console.log(`Fired getUserFlightByReference`);
  return await userFlightDatabase.findOne({ ref: reference }).lean();
};

const getInfoandLatestFlightsByReference = async (reference) => {
  const result = await getUserFlightByReference(reference)
  if (result === null) {
    return null
  } else {
    return result
  }
}

const changeFlightScanStatusByReference = async (reference, status) => {
  const UserFlight = await getUserFlightByReference(reference);
  UserFlight.isBeingScanned = status;
  await UserFlight.save();
};

const searchFlightByPID = async (workerPID) => {
  console.log(`searchFlightByPID fired`);
  return await userFlightDatabase.findOne({ workerPID: workerPID });
};

const changePIDByReference = async (reference, workerPID) => {
  const UserFlight = await getUserFlightByReference(reference);
  UserFlight.workerPID = workerPID;
  await UserFlight.save();
};

const changeFlightScanStatusByPID = async (workerPID, status) => {
  console.log(`changeFlightScanStatusByPID fired`);
  const UserFlight = await searchFlightByPID(workerPID);
  console.log(UserFlight);
  UserFlight.isBeingScanned = status;
  await UserFlight.save();
  console.log(`Flight status changed to ${status}`);
};

const changePIDToZero = async (workerPID) => {
  const UserFlight = await searchFlightByPID(workerPID);
  UserFlight.workerPID = 0;
  await UserFlight.save();
  console.log(`Worker PID changed to ${0}`);
};

const checkAmountOfProcessesInUse = async () => {
  const array = await userFlightDatabase.find({ workerPID: { $gt: 0 } });
  const number = array.length;
  console.log(number);
  return number;
};

// All functions will fire cheapestFlightScannedToday. We can add other parameters in the future
const cheapestFlightScannedToday = async (newUser) => {
  console.log("Started cheapestFlightScannedToday");
  // console.log(newUser)
  const Flight = await userFlightDatabase.findOne({ ref: newUser.ref });
  // console.log(Flight)
  const FlightArrays = await Flight.scanDate.at(-1).departureDate;
  let cheapestObject = [];
  let bestObject = [];
  for (let departureDateArray of FlightArrays) {
    console.log("new loop");
    for (let returnDatesArray of departureDateArray.returnDates) {
      if (returnDatesArray.cheapest.cost > 0) {
        cheapestObject.push(returnDatesArray);
      }
      if (returnDatesArray.best.cost > 0) {
        bestObject.push(returnDatesArray);
      }
    }
  }
  const cheapestFlightsOrder = cheapestObject.sort((a, b) => {
    return a.cheapest.cost - b.cheapest.cost;
  });

  const bestFlightsOrder = bestObject.sort((a, b) => {
    return a.best.cost - b.best.cost;
  });

  let cheapestFlightsOrderTopTen = [];
  let bestFlightsOrderTopTen = [];

  for (let i = 0; i < 10 && i < cheapestFlightsOrder.length; i++) {
    // console.log(`${i}: ${cheapestFlightsOrder[i]}`)
    cheapestFlightsOrderTopTen.push(cheapestFlightsOrder[i]);
  }
  console.log("####################");
  console.log("####################");
  console.log("####################");

  for (let i = 0; i < 10 && i < bestFlightsOrder.length; i++) {
    // console.log(`${i}: ${bestFlightsOrder[i]}`)
    bestFlightsOrderTopTen.push(bestFlightsOrder[i]);
  }
  console.log("Ending cheapestFlightScannedToday");
  return { cheapestFlightsOrderTopTen, bestFlightsOrderTopTen };
};

// We know users will have a reference. We can use this to find flights
const findUserFlight = async (reference) => {
  console.log("Started findUserFlight");
  return await userFlightDatabase.findOne({ ref: reference });
};

const checkUserFlightStuff = async (reference) => {
  console.log(`checkedUserFlightStuff passed reference = ${reference}`);
  const userFlight = await findUserFlight(reference);
  const {
    cheapestFlightsOrderTopTen: cheapestFlightsOrder,
    bestFlightsOrderTopTen: bestFlightsOrder,
  } = await cheapestFlightScannedToday(userFlight);
  return { cheapestFlightsOrder, bestFlightsOrder, userFlight };
};

const checkEmailAddress = async (email) => {
  return await userFlightDatabase.findOne({"user.email": email}).lean()
}

const getReferencesByEmailAddress = async (email) => {
  const result = await userFlightDatabase.find({"user.email": email}).lean()
  console.log("Returning getReferencesByEmailAddress results")
  return result.map(document => document.ref)
}

const checkFlightsTodayByFingerPrintId = async (fingerPrintId) => {
  const result = await userFlightDatabase.find({$and: [{"user.fingerPrintId": fingerPrintId},{"created": { $gte: new Date().toISOString().split('T')[0]}}]} ).lean()
  return result.length
}

// I'm expecting the flights to have been processed in cheapestFlightScannedToday.
const maximumHoliday = async (flightArray, daysOfMaxHoliday) => {
  console.log(`Starting maximumHoliday`);
  const sortedFlights = flightArray.filter((flight, index) => {
    // console.log(
    //   `flight.daysBetweenDepartureDateAndArrivalDate = ${
    //     flight.daysBetweenDepartureDateAndArrivalDate
    //   } while daysOfMaxHoliday = ${daysOfMaxHoliday} is flight.daysBetweenDepartureDateAndArrivalDate <= daysOfMaxHoliday? ${
    //     flight.daysBetweenDepartureDateAndArrivalDate <= daysOfMaxHoliday
    //   }`
    // );
    return flight.daysBetweenDepartureDateAndArrivalDate <= daysOfMaxHoliday;
  });
  return sortedFlights.filter((flights, index) => index <= 10);
};

const checkMaximumHoliday = async (reference) => {
  let { cheapestFlightsOrder, bestFlightsOrder, userFlight } =
    await checkUserFlightStuff(reference);
  console.log(`Cheapest Length ${cheapestFlightsOrder.length}`);
  const cheapestFlightsOrderMax = await maximumHoliday(
    cheapestFlightsOrder,
    userFlight.dates.maximumHoliday
  );
  const bestFlightsOrderMax = await maximumHoliday(
    bestFlightsOrder,
    userFlight.dates.maximumHoliday
  );
  console.log(
    `cheapestFlightsOrderMax Length = ${cheapestFlightsOrderMax.length}`
  );
  consoleOutput(cheapestFlightsOrderMax, bestFlightsOrderMax);
  // Send email
  // testEmail(cheapestFlightsOrderMax, bestFlightsOrderMax, userFlight);
  return { cheapestFlightsOrderMax, bestFlightsOrderMax };
};

const fireEvents = async (reference) => {
  const userFlight = await searchFlights(reference);
  await cheapestFlightScannedToday(userFlight);
  await checkMaximumHoliday(userFlight.ref);
};

const resetFlightStatus = async () => {
  await userFlightDatabase.updateMany({}, {isBeingScanned: false, workerPID: 0, nextScan: 0, scannedLast: 0})
  return {message: "reset successful"}
}

const getFlightsBySub = async (sub) => {
  console.log(`This is sub ${sub}`)
  const test = await userFlightDatabase.find({"user.sub": sub}).lean()
  console.log(test)
  return test
}

const consoleOutput = async (cheapestFlightsOrder, bestFlightsOrder) => {
  console.log("#################");
  console.log(">> Max Holiday Output: Cheapest <<");
  console.log(cheapestFlightsOrder);
  console.log("#################");
  console.log(">> Max Holiday Output: Best <<");
  console.log(bestFlightsOrder);
  console.log("#################");
};

module.exports = {
  createUser,
  updateUserByReference,
  userTest,
  getAllEmails,
  checkEmailAddress,
  checkFlightsTodayByFingerPrintId,
  getReferencesByEmailAddress,
  checkIfFlightTimeForScan,
  getUserFlightByReference,
  changeFlightScanStatusByReference,
  changePIDByReference,
  searchFlightByPID,
  changeFlightScanStatusByPID,
  changePIDToZero,
  getAllDocuments,
  getAllReferences,
  checkAmountOfProcessesInUse,
  cheapestFlightScannedToday,
  findUserFlight,
  maximumHoliday,
  checkUserFlightStuff,
  checkMaximumHoliday,
  fireEvents,
  getInfoandLatestFlightsByReference,
  resetFlightStatus,
  getFlightsBySub,
};
