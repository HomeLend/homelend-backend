const db = require('../lib/db');
const userModel = db.model('Users');
const propertyModel = db.model('Properties');
const httpStatus = require('http-status-codes');
const invokeChaincode = require('./hl/invoke-transaction');
const queryChaincode = require('./hl/query');
const logger = require('../lib/logger');
const config = require('config');
const helper = require('./hl/helper');
const UsersCacheModel = db.model('UsersCache');
const chaincodeName = config.get('lending_chaincode');
const org_name = 'org_pocbuyer';
const uniqueString = require('unique-string');
const {last, filter} = require('lodash');
const [ adminUsername, adminPassword ] = [config.admins[0].username, config.admins[0].secret];

const attrs = [
    {
        'hf.Registrar.Roles': 'client,user,peer,validator,auditor',
        'hf.Registrar.DelegateRoles': 'client,user,validator,auditor',
        'hf.Revoker': true,
        'hf.IntermediateCA': true,
        //user role can be customized
        BasicRole: adminUsername,
        'hf.Registrar.Attributes': '*',
    }];
const dept = 'mashreq' + '.department1';

/**
 * Function registers the request for the buyer
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {undefined}
 *
 * @param {String} req.body.PropertyHash
 * @param {String} req.body.AppraiserHash
 * @param {String} req.body.SellerHash
 * @param {String} req.body.BuyerHash
 * @param {String} req.body.InsuranceHash
 * @param {string} req.body.CreditScore
 * @param {String} req.body.AppraiserPrice
 * @param {Number} req.body.AppraiserAmount
 * @param {String} req.body.InsuranceAmount
 * @param {String} req.body.GovernmentResult1
 * @param {String} req.body.GovernmentResult2
 * @param {String} req.body.GovernmentResult3
 * @param {String} req.body.InsuranceOffers
 * @param {Number} req.body.Salary
 * @param {Number} req.body.LoanAmount
 * @param {String} req.body.Status
 */

const runMethodAndRegister = async (req, res, methodName, data, userData) => {
	const email = String(userData.Email).toLowerCase();
  const type = 'buyer';

  try {
      const currentUser = await UsersCacheModel.findOne({email, type});
      if (!currentUser) {
        const registerResult = await helper.register(org_name, email, attrs, dept, adminUsername, adminPassword)
          if (!registerResult && !registerResult.secret) throw 'Problem registering user';
          const user = await UsersCacheModel({
            email, type,
						password: registerResult.secret,
            key: registerResult.key,
            certificate: registerResult.certificate,
            rootCertificate: registerResult.rootCertificate,
          }).save();
          if (!user) throw 'Problem saving the user';
          let response = await invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, 'putBuyerPersonalInfo', [JSON.stringify(userData)], org_name, email, registerResult.secret, null, null, {returnUser: true})
          if (!response) throw 'Problem saving the user inside blockchain';

          response = await invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, methodName, data, org_name, email, registerResult.secret, null, null, {returnUser: true})
          if (!response) throw 'Problem putting buyer\'s request';
          return res.status(200).send(response);
      } else {
        const response = await invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, methodName, data, org_name, email, currentUser.password, null, null, {returnUser: true})
        if (!response) throw 'Problem executing ' + methodName;
        return res.status(200).send(response);
      }

    } catch (err) {
        return res.status(400).send(err);
    }
};

const runMethodWithIdentity = (req, res, methodName, data, email) => {
    UsersCacheModel.findOne({ email: email, type: 'buyer' }).then((currentUser) => {
        if (!currentUser) {
            return res.status(400).send('user was not found');
        }
        else {
            return invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, methodName, data, org_name, email, currentUser.password).then((response) => {
                if (!response) {
                    return res.status(400).send({ err: ' Problem executing ' + methodName });
                }
                return res.status(200).send(response);
            });
        }
    }).catch((err) => {
        return res.status(400).send({ err: err });
    });
};



module.exports.buy = (req, res) => {

    const { email, idNumber, idBase64, fullName, propertyHash, sellerHash, salary, loanAmount } = req.body
    const putBuyerPersonalInfoData = {
        FullName: fullName,
        Email: email,
        IDNumber: idNumber + ``,
        IDBase64: idBase64
    };


    const buyData = {
        Hash: uniqueString(),
        PropertyHash: propertyHash,
        SellerHash: sellerHash,
        Salary: parseInt(salary, 10),
        LoanAmount: parseInt(loanAmount, 10)
    };

    return runMethodAndRegister(req, res, 'buy', [JSON.stringify(buyData)], putBuyerPersonalInfoData);
};

module.exports.getMyRequests = async (req, res) => {
  const email = req.query.email.toLowerCase();
  try {
		const currentUser = await UsersCacheModel.findOne({email, type: 'buyer'});
		if (!currentUser) throw 'User not found'

		const response = await queryChaincode.queryChaincode(['peer0'], config.get('channelName'), chaincodeName, 'buyerGetMyRequests', ['{}'], org_name, email, currentUser.password)
		if (!response) throw 'Not a proper response for buyerGetMyRequests'

		let ret = response[0].toString('utf8');
		ret = JSON.parse(ret);

		// Get only results of the last mortgage request by the latest hash in the array
		let retFiltered = filter(ret, {Hash: last(ret)['Hash']})
		return res.status(200).send(retFiltered);
	}
	catch (err) {
    console.log("Check getMyRequests at buyerController.js", err);
		return res.status(400).send(err);
  }
};

module.exports.selectBankOffer = (req, res) => {
    const { email, requestHash, selectedBankOfferHash } = req.body
    const data = [
        requestHash, selectedBankOfferHash
    ];

    return runMethodWithIdentity(req, res, 'buyerSelectBankOffer', data, email);
};

module.exports.uploadDocuments = (req, res) => {
    const body = {};
    invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), config.get('lending_chaincode'), 'putBuyerPersonalInfo', [JSON.stringify(body)], adminUsername, 'org_pocseller').then((response) => {
        return res.send(response);
    }).catch((err) => {
        console.log(err);
    });
};

module.exports.getConfirmedRequests = (req, res) => {
    return res.send([
        {
            interestRate: 1,
            fiId: '12321321',
            months: 24,
            fiName: '123213',
        },
        {
            interestRate: 2,
            fiId: '1232132sad1',
            months: 24,
            fiName: '12321asdads3',
        },
    ]);
};

module.exports.acceptOfferFromBank = (req, res) => {
    const offerId = req.body.offerId;
    return res.send({
        offerId: 123131,
        status: 'CONFIRMED_BY_USER',
        txHash: '1232131',
        chaincodeAddress: 'asdasdasdasdasd',

    });
};

// list of appraiser
module.exports.listOfAppraisers = (req, res) => {
    return queryChaincode.queryChaincode(['peer0'], config.get('channelName'), chaincodeName, 'buyerGetAllAppraisers', [JSON.stringify({})], org_name, adminUsername, adminPassword).then((response) => {
        if (!response)
            throw 'Not a proper response for getProperties4Sale'

        let ret = response[0].toString('utf8');

        return res.status(200).send(JSON.parse(ret));
        cb(JSON.parse(ret));
    });
};

// list of insurance offers with the price
module.exports.listOfInsuranceOffers = (req, res) => {
    return res.send([
        {
            montlyPrice: 1213,
            insuranceId: 123123
        }
    ]);
};

module.exports.selectAppraiser = (req, res) => {
    const { email, appraiserHash, requestHash } = req.body
    const data = [
        requestHash, appraiserHash
    ];

    return runMethodWithIdentity(req, res, 'buyerSelectAppraiser', data, email);
};

module.exports.selectInsuranceOffer = (req, res) => {
    const { email, insuranceOfferHash, requestHash } = req.body
    const data = [
        requestHash, insuranceOfferHash
    ];

    return runMethodWithIdentity(req, res, 'buyerSelectInsuranceOffer', data, email);
};

module.exports.acceptOfferFromInsurance = (req, res) => {
    const insuranceId = req.body.insuranceId;

    return res.send({
        txHash: 'asdadad',
        status: 'INSURANCE_OFFER_ACCEPTED',
        chaincodeAddress: '1231'
    });
};

/**
 *
 * @param req
 * @param res
 *
 */
module.exports.getProperties = (req, res) => {
    const email = req.body.email;

    UsersCacheModel.findOne({ email: email, type: 'buyer' }).then((currentUser) => {
        if (!currentUser) {

            return queryChaincode.queryChaincode(['peer0'], config.get('channelName'), chaincodeName, 'getProperties', [JSON.stringify({})], org_name, email, registerResult.secret).then((response) => {
                if (!response) {
                    return res.status(httpStatus.BAD_REQUEST).send({ err: ' Problem saving the user inside blockchain' });
                }
                //we must handle error in more proper way
                return res.status(200).send(JSON.parse(response[0].toString('utf8')));

                const array = [];
                for (let i = 0; i < response.length; i++) {
                    array.push(response[i].toString('utf8'));
                }
                return res.status(200).send(JSON.parse(array));
            });
        }
    });
};


module.exports.getProperties4Sale = (req, res) => {
    return queryChaincode.queryChaincode(['peer0'], config.get('channelName'), chaincodeName, 'getProperties4Sale', [JSON.stringify({})], org_name, adminUsername, adminPassword).then((response) => {
        if (!response)
            throw 'Not a proper response for getProperties4Sale'

        let ret = response[0].toString('utf8');

      return res.status(200).send(JSON.parse(ret));
    });
};

module.exports.getProperties4SaleSocket = (cb) => {
    return queryChaincode.queryChaincode(['peer0'], config.get('channelName'), chaincodeName, 'getProperties4Sale', [JSON.stringify({})], org_name, adminUsername, adminPassword).then((response) => {
        if (!response)
            throw 'Not a proper response for getProperties4Sale'

        let ret = response[0].toString('utf8');

      cb(JSON.parse(ret));
    });
};

module.exports.query = (req, res) => {
    const query  =req.query.query;
    return queryChaincode.queryChaincode(['peer0'], config.get('channelName'), chaincodeName, 'query', [JSON.stringify({query})], org_name, adminUsername, adminPassword).then((response) => {
        if (!response)
            throw 'Not a proper response for getProperties4Sale'

        let ret = response[0].toString('utf8');

        return res.status(200).send(JSON.parse(ret));
    });
};