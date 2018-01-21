const db = require('../lib/db');
const { invokeChaincode }= require('./hl/invoke-transaction');
const logger = require('../lib/logger');
const queryChaincode = require('./hl/query');
const config = require('config');
const helper = require('./hl/helper');
const UsersCacheModel = db.model('UsersCache');
const chaincodeName = config.get('lending_chaincode');
const org_name = 'org_pocbank';
const uniqueString = require('unique-string');
const {filter, last} = require('lodash');
const [ adminUsername, adminPassword ] = [config.admins[0].username, config.admins[0].secret];

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
	const {name, swiftNumber, userHash, requestHash, interest, monthlyPayment} = req.body;

	const bankData = {
		Name: name,
		SwiftNumber: swiftNumber
	};
	const requestLink = {
		RequestHash: requestHash,
		UserHash: userHash
	}

	try {
		const currentUser = await UsersCacheModel.findOne({email: swiftNumber, type: 'bank'})
		let passOrSecret = get(currentUser, 'password');
		if (!currentUser) {
			const registerResult = await helper.register(org_name, swiftNumber, attrs, dept, adminUsername, adminPassword)
			if (!registerResult && !registerResult.secret) throw 'Problem registering agency';

			const newBankDetails = {
				email: swiftNumber,
				password: registerResult.secret,
				type: 'bank',
				key: registerResult.key,
				certificate: registerResult.certificate,
				rootCertificate: registerResult.rootCertificate,
			};
			const user = await UsersCacheModel(newBankDetails).save();
			if (!user) throw 'Problem saving the bank';

			const response = await invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, 'putBankInfo', [JSON.stringify(bankData)], org_name, swiftNumber, registerResult.secret)
			if (!response) throw 'Problem saving the bank inside blockchain';

			passOrSecret = registerResult.secret;
		}

		const bankPutOfferData = [JSON.stringify(requestLink), uniqueString(), parseFloat(interest) + "", parseFloat(monthlyPayment) + ""];
		const responseOffer = await invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, 'bankPutOffer', bankPutOfferData, org_name, swiftNumber, passOrSecret)
		if (!responseOffer) throw 'Problem updating bank offer';

		return res.status(200).send(responseOffer);
	}
	catch (err) {
		console.log("Check bankController.js, calculateRating: ", err);
		return res.status(400).send({err: err});
	}
};


module.exports.bankApprove = (req, res) => {
	const { userHash, requestHash, swiftNumber } = req.body;

	const requestLink = {
		RequestHash: requestHash,
		UserHash: userHash
	}

	const requestData = [JSON.stringify(requestLink)];

	UsersCacheModel.findOne({ email: swiftNumber, type: 'bank' }).then((currentUser) => {
		if (!currentUser) {
			return res.status(400).send('user was not found');
		}
		else {
			return invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, 'bankApprove', requestData, org_name, swiftNumber, currentUser.password).then((response) => {
				if (!response) {
					return res.status(httpStatus.BAD_REQUEST).send({ err: ' Problem executing ' + methodName });
				}
				return res.status(200).send(response);
			});
		}
	}).catch((err) => {
		return res.status(httpStatus.BAD_REQUEST).send({ err: err });
	});
};

module.exports.bankRunChaincode = (req, res) => {
	const { userHash, requestHash, swiftNumber } = req.body;

	const requestLink = {
		RequestHash: requestHash,
		UserHash: userHash
	}

	const requestData = [JSON.stringify(requestLink)];

	UsersCacheModel.findOne({ email: swiftNumber, type: 'bank' }).then((currentUser) => {
		if (!currentUser) {
			return res.status(400).send('user was not found');
		}
		else {
			return invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, 'bankRunChaincode', requestData, org_name, swiftNumber, currentUser.password).then((response) => {
				if (!response) {
					return res.status(httpStatus.BAD_REQUEST).send({ err: ' Problem executing ' + methodName });
				}
				return res.status(200).send(response);
			});
		}
	}).catch((err) => {
		return res.status(httpStatus.BAD_REQUEST).send({ err: err });
	});
};

module.exports.pull = async (req, res) => {
	const {buyerHash} = req.body;
	try {
		if (!buyerHash) throw 'No buyer hash received, make sure to provide a buyer hash before fetching requests'

		const response = await queryChaincode.queryChaincode(['peer0'], config.get('channelName'), chaincodeName, 'bankPullOpen4bankOffers', [JSON.stringify({})], org_name, adminUsername, adminPassword)
		if (!response) throw 'Not a proper response for bankPullOpen4bankOffers'

		let ret = response[0].toString('utf8');
		if (ret) ret = JSON.parse(ret);

		ret = filter(ret, {UserHash: buyerHash});
		if (!ret) throw 'No recent requests'

		// Get only the last request to present
		ret = last(ret);

		// Getting extended data about this request
		let reqData = await queryChaincode.queryChaincode(['peer0'], config.get('channelName'), chaincodeName, 'getRequestInfo', [ret.UserHash, ret.RequestHash], org_name, adminUsername, adminPassword)
		reqData = reqData[0].toString();
		reqData = JSON.parse(reqData);

		return res.status(200).send(reqData);
	}
	catch (err) {
		console.log("Check bankController.js, pull: ", err);
		return res.status(400).send({err: err});
	}
};