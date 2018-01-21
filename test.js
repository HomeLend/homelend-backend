const axios = require("axios");
var Stopwatch = require("node-stopwatch").Stopwatch;

const baseUrl = "http://10.0.0.31:3000/api/v1/";

const advertiseData = {
  "fullName": "Ran shtivi",
  "idNumber": "3000192392",
  "email": "ran@homelend.co.il2",
  "address": "שדרות 8החתולdddים 18 - חgfי",
  "sellingPrice": 1070000,
  "imageBase64": "1723"
}

const buyData = {
  "email": "aba@w7alla.com2",
  "idNumber": "201327616d",
  "fullName": "izikd",
  "salary": 12000,
  "duration": 300,
  "loanAmount": 800000,
  "propertyHash": "57f171f6da0ed59e2209e18af22bcf5f",
  "sellerHash": "eDUwOTo6Q049cmFuQGhvbWVsZW5kLmNvLmlsOjpDTj1jYS5wb2NzZWxsZXIuaG9tZWxlbmQuaW8sTz1wb2NzZWxsZXIuaG9tZWxlbmQuaW8sTD1TYW4gRnJhbmNpc2NvLFNUPUNhbGlmb3JuaWEsQz1VUw=="
}

const creditScoreData = {
  "licenseNumber": "14234567814",
  "name": "Koko rating agency",
  "userHash": "eDUwOTo6Q049YWJhQHc3YWxsYS5jb206OkNOPWNhLnBvY2J1eWVyLmhvbWVsZW5kLmlvLE89cG9jYnV5ZXIuaG9tZWxlbmQuaW8sTD1TYW4gRnJhbmNpc2NvLFNUPUNhbGlmb3JuaWEsQz1VUw==",
  "requestHash": "7736c05e7e7a25520b9959fead064a98"
}

const bankCalcualteData = {
  "name": "בנק איגוד",
  "swiftNumber": "1233",
  "interest": 3,
  "userHash": "eDUwOTo6Q049YWJhQHc3YWxsYS5jb206OkNOPWNhLnBvY2J1eWVyLmhvbWVsZW5kLmlvLE89cG9jYnV5ZXIuaG9tZWxlbmQuaW8sTD1TYW4gRnJhbmNpc2NvLFNUPUNhbGlmb3JuaWEsQz1VUw==",
  "requestHash": "7736c05e7e7a25520b9959fead064a98"
}

const appraiserData = {
  "email": "abu@afash.dag",
  "lastName": "isa",
  "firstName": "mohaMADD",
  "idNumber": "0123456789"
}

const insuranceData = {
  "licenseNumber": "1234568888",
  "Name": "AIG",
  "address": "שדרות הינשופים 18"
}


const runMethodPost = async (url, data) => {
  try {
    console.log('Post: ', url);
    const response = await axios.post(baseUrl + url, data);
    console.log(url, response.status, response.data);
    return response;
  } catch (error) {
    console.log('error - ' + url, error);
  }
};

const runMethodGet = async (url, data) => {
  try {
    console.log('Post: ', url);
    const response = await axios.get(baseUrl + url, data);
    console.log(url, response.status, response.data);


    return response.data
  } catch (error) {
    console.log('error - ' + url, error);
  }
};


const run = async () => {
  bankCalcualteData.swiftNumber = makeidInt(8);
  appraiserData.email = makeid(8) + '@gmail.com';
  insuranceData.licenseNumber = makeidInt(8);
  var stopwatch = Stopwatch.create();
  await runMethodPost("seller/advertise", advertiseData);
  var properties4sale = await runMethodGet('buyer/properties4Sale', null)
  if (properties4sale == null || properties4sale.length == 0) {
    console.log("no properties for sale")
    return;
  }

  const propertyHash = properties4sale[properties4sale.length - 1].Hash;
  const sellerHash = properties4sale[properties4sale.length - 1].SellerHash;

  buyData.sellerHash = sellerHash;
  buyData.propertyHash = propertyHash;
  buyData.duration = Math.floor(Math.random() * 100) + 260;
  await runMethodPost("buyer/buy", buyData)
  let creditScoreResults = await runMethodPost("creditscore/pull", null)
  creditScoreResults = creditScoreResults.data;
  if (creditScoreResults == null || creditScoreResults.length < 1) {
    console.log("creditScoreResults.length < 1")
    return; 
  }

  const buyerHash = creditScoreResults[creditScoreResults.length - 1].UserHash;
  const requestHash = creditScoreResults[creditScoreResults.length - 1].RequestHash;

  creditScoreData.userHash = buyerHash;
  creditScoreData.requestHash = creditScoreResults[creditScoreResults.length - 1].RequestHash;
  await runMethodPost("creditscore/calculate", creditScoreData);

  bankCalcualteData.requestHash = requestHash;
  bankCalcualteData.userHash = buyerHash;
  await runMethodPost("bank/calculate", bankCalcualteData);
  let requests = await runMethodGet('buyer/myRequests?email=' + buyData.email, null);
  let request = requests[requests.length - 1];

  await runMethodPost("buyer/selectBankOffer", { email: buyData.email, requestHash: requestHash, selectedBankOfferHash: request.BankOffers[0].Hash });

  await runMethodPost("appraiser/register", appraiserData);
  const appraisers = await runMethodGet("buyer/appraisers", null);

  await runMethodPost("buyer/selectAppraiser", { email: buyData.email, requestHash: requestHash, appraiserHash: appraisers[appraisers.length - 1].AppraiserHash });

  let dataa = { email: appraisers[appraisers.length - 1].Email, buyerHash: buyerHash, requestHash: requestHash, amount: buyData.loanAmount };
  await runMethodPost("appraiser/estimation", dataa);
  await runMethodPost("insurance/register", insuranceData);

  await runMethodPost("insurance/putOffer", { licenseNumber: insuranceData.licenseNumber, userHash: buyerHash, requestHash: requestHash, amount: 404 });

  requests = await runMethodGet('buyer/myRequests?email=' + buyData.email, null);
  request = requests[requests.length - 1];

  await runMethodPost("buyer/selectInsuranceOffer", { email: buyData.email, insuranceOfferHash: request.InsuranceOffers[0].Hash, requestHash: requestHash });
  await runMethodPost("government/updateRequest", { buyerHash: buyerHash, requestHash: requestHash, checkHouseOwner: "true", checkLien: "true", checkWarningShot: "true" });
  await runMethodPost("bank/approve", { userHash: buyerHash, requestHash: requestHash, swiftNumber: bankCalcualteData.swiftNumber });
  await runMethodPost("bank/runChaincode", { userHash: buyerHash, requestHash: requestHash, swiftNumber: bankCalcualteData.swiftNumber });

  console.log('', buyerHash);
  console.log('', requestHash);
}
run();


function makeid(len) {
  var text = "";
  var possible = "abcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < len; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

function makeidInt(len) {
  var text = "";
  var possible = "0123456789";

  for (var i = 0; i < len; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}