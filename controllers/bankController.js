const db = require('../lib/db');
const { invokeChaincode } = require('./hl/invoke-transaction');
const logger = require('../lib/logger');
const queryChaincode = require('./hl/query');
const config = require('config');
const helper = require('./hl/helper');
const UsersCacheModel = db.model('UsersCache');
const chaincodeName = config.get('lending_chaincode');
const org_name = 'org_pocbank';
const uniqueString = require('unique-string');
const { get, filter, last } = require('lodash');
const [adminUsername, adminPassword] = [config.admins[0].username, config.admins[0].secret];
const httpStatus = require('http-status-codes');
const hyplerHelper = require('./../hyplerHelper');

const attrs = [{
	'hf.Registrar.Roles': 'client,user,peer,validator,auditor',
	'hf.Registrar.DelegateRoles': 'client,user,validator,auditor',
	'hf.Revoker': true,
	'hf.IntermediateCA': true,
	//user role can be customized
	BasicRole: adminUsername,
	'hf.Registrar.Attributes': '*',
}];
const dept = 'pocbank' + '.department1';

module.exports.calculateRating = async (req, res) => {
	const { name, swiftNumber, userHash, requestHash, interest, monthlyPayment } = req.body;

	const bankData = {
		Name: name,
		SwiftNumber: swiftNumber
	};
	const requestLink = {
		RequestHash: reqFuestHash,
		UserHash: userHash
	}

	const bankPutOfferData = [JSON.stringify(requestLink), uniqueString(), parseFloat(interest) + ""];
	result = await hyplerHelper.runMethodAndRegister('bankPutOffer', 'putBankInfo', bankPutOfferData, [JSON.stringify(bankData)], swiftNumber, org_name, 'bank', attrs, dept);
	return res.status(result.status).send(result);
};


module.exports.bankApprove = async (req, res) => {
	const { userHash, requestHash, swiftNumber } = req.body;

	const requestLink = {
		RequestHash: requestHash,
		UserHash: userHash
	}

	const requestData = [JSON.stringify(requestLink)];

	const response = await hyplerHelper.runMethodWithIdentity('bankApprove', requestData, swiftNumber, 'bank', org_name);
	return res.status(response.status).send({ err: response.err });
};

module.exports.bankRunChaincode = async (req, res) => {
	const { userHash, requestHash, swiftNumber } = req.body;

	const requestLink = {
		RequestHash: requestHash,
		UserHash: userHash
	}

	const requestData = [JSON.stringify(requestLink)];

	const response = await hyplerHelper.runMethodWithIdentity('bankRunChaincode', requestData, swiftNumber, 'bank', org_name);
	return res.status(response.status).send({ err: response.err });
};

module.exports.pull = async (req, res) => {
	const { buyerHash } = req.body;
	try {
		if (!buyerHash) throw 'No buyer hash received, make sure to provide a buyer hash before fetching requests'

		const response = await queryChaincode.queryChaincode(['peer0'], config.get('channelName'), chaincodeName, 'bankPullOpen4bankOffers', [JSON.stringify({})], org_name, adminUsername, adminPassword)
		if (!response) throw 'Not a proper response for bankPullOpen4bankOffers'

		let ret = response[0].toString('utf8');
		// if (ret.startWith('Error'))
		// 	throw ret;
		if (ret) ret = JSON.parse(ret);

		// ret = filter(ret, {UserHash: buyerHash});
		// if (!ret) throw 'No recent requests'

		// Get only the last request to present
		ret = last(ret);

		// Getting extended data about this request
		let reqData = await queryChaincode.queryChaincode(['peer0'], config.get('channelName'), chaincodeName, 'getRequestInfo', [ret.UserHash, ret.RequestHash], org_name, adminUsername, adminPassword)
		reqData = reqData[0].toString();
		reqData = JSON.parse(reqData);

		return res.status(httpStatus.OK).send(reqData);
	}
	catch (err) {
		console.log("Check bankController.js, pull: ", err);
		return res.status(httpStatus.BAD_REQUEST).send({ err: err.message });
	}
};



module.exports.pullPending4Final = async (req, res) => {
	const { swiftNumber } = req.query;

	const result = await hyplerHelper.runQueryWithIdentity(swiftNumber, 'bankPullPending4FinalAppproval', 'bank', org_name);
	return result.status == httpStatus.OK ? res.status(httpStatus.OK).send(result.data) : res.status(result.status).send(result.err);
};

module.exports.PullForChainCodeExecute = async (req, res) => {
	const { swiftNumber } = req.query;

	const result = await hyplerHelper.runQueryWithIdentity(swiftNumber, 'bankPull4ChaninCodeExecute', 'bank', org_name);
	return result.status == httpStatus.OK ? res.status(httpStatus.OK).send(result.data) : res.status(result.status).send(result.err);
};