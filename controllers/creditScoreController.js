const db = require('../lib/db');
const httpStatus = require('http-status-codes');
const invokeChaincode = require('./hl/invoke-transaction');
const logger = require('../lib/logger');
const Promise = require('bluebird');
const config = require('config');
const helper = require('./hl/helper');
const UsersCacheModel = db.model('UsersCache');
const chaincodeName = config.get('lending_chaincode');
const org_name = 'org_poccreditratingagency';
const uniqueString = require('unique-string');
const queryChaincode = require('./hl/query');
const { filter } = require('lodash');

const attrs = [
    {
        'hf.Registrar.Roles': 'client,user,peer,validator,auditor',
        'hf.Registrar.DelegateRoles': 'client,user,validator,auditor',
        'hf.Revoker': true,
        'hf.IntermediateCA': true,
        //user role can be customized
        BasicRole: 'admin',
        'hf.Registrar.Attributes': '*',
    }];
const dept = 'mashreq' + '.department1';
const adminUsername = 'admin';
const adminPassword = 'adminpw';
module.exports.calculateRating = async (req, res) => {
	const {name, licenseNumber, requestHash, userHash} = req.body;
	let score = Math.random();
	if (score > 0.66) score = "A"; else if (score > 0.33) score = "B"; else score = "C";

	const creditRatingAgencyData = {
		Name: name,
		LicenseNumber: licenseNumber
	};

	const creditScorePayload = {
		RequestHash: requestHash,
		UserHash: userHash
	}
	try {
		let response = '';
		const currentUser = await UsersCacheModel.findOne({email: licenseNumber, type: 'credit-rating'})
		if (!currentUser) {
			const registerResult = await helper.register(org_name, licenseNumber, attrs, dept, adminUsername, adminPassword)
			if (!registerResult && !registerResult.secret) throw 'Problem registering agency'
			const user = await UsersCacheModel({
				email: licenseNumber,
				password: registerResult.secret,
				type: 'credit-rating',
				key: registerResult.key,
				certificate: registerResult.certificate,
				rootCertificate: registerResult.rootCertificate
			}).save();
			if (!user) throw 'Problem saving the agency'

			response = await invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, 'putCreditRatingAgencyInfo', [JSON.stringify(creditRatingAgencyData), score], org_name, licenseNumber, registerResult.secret)
			if (!response) throw 'Problem saving the agency inside blockchain'

			response = invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, 'creditScore', [JSON.stringify(creditScorePayload)], org_name, licenseNumber, registerResult.secret)
			if (!response) throw 'Problem updating credit score'

		} else {

			response = await invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, 'creditScore', [JSON.stringify(creditScorePayload)], org_name, licenseNumber, currentUser.password)
			if (!response) throw 'Problem updating credit score'

		}
		return res.status(200).send(response);
	}
	catch (err) {
		return res.status(httpStatus.BAD_REQUEST).send({err: err});
	}
}


module.exports.getCreditRatingListSocket = async (cb) => {
    try {
      const response = await queryChaincode.queryChaincode(['peer0'], config.get('channelName'), chaincodeName, 'creditRatingPull', [JSON.stringify({})], org_name, 'admin', 'adminpw')
      if (!response)
        throw 'Not a proper response for creditScoreController: getCreditRatingListSocket'

      let ret = response[0].toString('utf8');
      cb(JSON.parse(ret));
    }
    catch (err) {
        console.log("something broke", err)
    }
};

module.exports.pull = (req, res) => {
    const { buyerHash } = req.body;
    if(!buyerHash) throw 'No buyer hash received, make sure to provide a buyer hash before fetching requests'
    return queryChaincode.queryChaincode(['peer0'], config.get('channelName'), chaincodeName, 'creditRatingPull', [JSON.stringify({})], org_name, 'admin', 'adminpw').then(async (response) => {
        if (!response)
          throw 'Not a proper response for creditScoreController: pull'

      let ret = response[0].toString('utf8');
      if(ret) ret = JSON.parse(ret);

      ret = filter(ret, {UserHash: buyerHash});
      if(!ret[0])
          throw 'No recent requests'

      let reqData = await queryChaincode.queryChaincode(['peer0'], config.get('channelName'), chaincodeName, 'getRequestInfo', [ret[0].UserHash, ret[0].RequestHash], org_name, 'admin', 'adminpw')
			reqData = reqData[0].toString();
      reqData = JSON.parse(reqData);

			return res.status(200).send(reqData);
    });
};