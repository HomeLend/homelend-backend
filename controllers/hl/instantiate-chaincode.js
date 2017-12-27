'use strict';
const path = require('path');
const fs = require('fs');
const util = require('util');
const hfc = require('fabric-client');
const helper = require('./helper.js');
const logger = helper.getLogger('instantiate-chaincode');

const instantiateChaincode = async function(channelName, chaincodeName, chaincodeVersion, functionName, chaincodeType, args, username, org_name) {
	logger.debug('\n\n============ Instantiate chaincode on channel ' + channelName +
		' ============\n');
	let error_message = null;
	const eventhubs_in_use = [];
	try {
		// first setup the client for this org
		const client = await helper.getClientForOrg(org_name, username);
		logger.debug('Successfully got the fabric client for the organization "%s"', org_name);
		const channel = client.getChannel(channelName);
		if(!channel) {
			let message = util.format('Channel %s was not defined in the connection profile', channelName);
			logger.error(message);
			throw new Error(message);
		}
		const tx_id = client.newTransactionID(true); // Get an admin based transactionID
		                                       // An admin based transactionID will
		                                       // indicate that admin identity should
		                                       // be used to sign the proposal request.
		// will need the transaction ID string for the event registration later
		const deployId = tx_id.getTransactionID();

		// send proposal to endorser
		const request = {
			chaincodeId: chaincodeName,
			chaincodeType: chaincodeType,
			chaincodeVersion: chaincodeVersion,
			args: args,
			txId: tx_id
		};

		if (functionName)
			request.fcn = functionName;

		let results = await channel.sendInstantiateProposal(request, 60000); //instantiate takes much longer

		// the returned object has both the endorsement results
		// and the actual proposal, the proposal will be needed
		// later when we send a transaction to the orderer
		const proposalResponses = results[0];
		const proposal = results[1];

		// lets have a look at the responses to see if they are
		// all good, if good they will also include signatures
		// required to be committed
		let all_good = true;
		for (const i in proposalResponses) {
			let one_good = false;
			if (proposalResponses && proposalResponses[i].response &&
				proposalResponses[i].response.status === 200) {
				one_good = true;
				logger.info('instantiate proposal was good');
			} else {
				logger.error('instantiate proposal was bad');
			}
			all_good = all_good & one_good;
		}

		if (all_good) {
			logger.info(util.format(
				'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s", metadata - "%s", endorsement signature: %s',
				proposalResponses[0].response.status, proposalResponses[0].response.message,
				proposalResponses[0].response.payload, proposalResponses[0].endorsement
				.signature));

			// tell each peer to join and wait for the event hub of each peer to tell us
			// that the channel has been created on each peer
			const promises = [];
			let event_hubs = client.getEventHubsForOrg(org_name);
			logger.debug('found %s eventhubs for this organization %s',event_hubs.length, org_name);
			event_hubs.forEach((eh) => {
				let instantiateEventPromise = new Promise((resolve, reject) => {
					logger.debug('instantiateEventPromise - setting up event');
					let event_timeout = setTimeout(() => {
						let message = 'REQUEST_TIMEOUT:' + eh._ep._endpoint.addr;
						logger.error(message);
						eh.disconnect();
						reject(new Error(message));
					}, 60000);
					eh.registerTxEvent(deployId, (tx, code) => {
						logger.info('The chaincode instantiate transaction has been committed on peer %s',eh._ep._endpoint.addr);
						clearTimeout(event_timeout);
						eh.unregisterTxEvent(deployId);

						if (code !== 'VALID') {
							let message = until.format('The chaincode instantiate transaction was invalid, code:%s',code);
							logger.error(message);
							reject(new Error(message));
						} else {
							let message = 'The chaincode instantiate transaction was valid.';
							logger.info(message);
							resolve(message);
						}
					}, (err) => {
						clearTimeout(event_timeout);
						eh.unregisterTxEvent(deployId);
						let message = 'Problem setting up the event hub :'+ err.toString();
						logger.error(message);
						reject(new Error(message));
					});
				});
				promises.push(instantiateEventPromise);
				eh.connect();
				eventhubs_in_use.push(eh);
			});

			const orderer_request = {
				txId: tx_id, //must includethe transaction id so that the outbound
				             // transaction to the orderer will be signed by the admin
							 // id as was the proposal above, notice that transactionID
							 // generated above was based on the admin id not userContext.
				proposalResponses: proposalResponses,
				proposal: proposal
			};
			const sendPromise = channel.sendTransaction(orderer_request);
			// put the send to the orderer last so that the events get registered and
			// are ready for the orderering and committing
			promises.push(sendPromise);
			let results = await Promise.all(promises);
			logger.debug(util.format('------->>> R E S P O N S E : %j', results));
			let response = results.pop(); //  orderer results are last in the results
			if (response.status === 'SUCCESS') {
				logger.info('Successfully sent transaction to the orderer.');
			} else {
				error_message = util.format('Failed to order the transaction. Error code: %s',response.status);
				logger.debug(error_message);
			}

			// now see what each of the event hubs reported
			for(let i in results) {
				let event_hub_result = results[i];
				let event_hub = event_hubs[i];
				logger.debug('Event results for event hub :%s',event_hub._ep._endpoint.addr);
				if(typeof event_hub_result === 'string') {
					logger.debug(event_hub_result);
				} else {
					if(!error_message) error_message = event_hub_result.toString();
					logger.debug(event_hub_result.toString());
				}
			}
		} else {
			error_message = util.format('Failed to send Proposal and receive all good ProposalResponse');
			logger.debug(error_message);
		}
	} catch (error) {
		logger.error('Failed to send instantiate due to error: ' + error.stack ? error.stack : error);
		error_message = error.toString();
	}

	// need to shutdown open event streams
	eventhubs_in_use.forEach((eh) => {
		eh.disconnect();
	});

	if (!error_message) {
		let message = util.format(
			'Successfully instantiate chaingcode in organization %s to the channel \'%s\'',
			org_name, channelName);
		logger.info(message);
		// build a response to send back to the REST caller
		let response = {
			success: true,
			message: message
		};
		return response;
	} else {
		let message = util.format('Failed to instantiate. cause:%s',error_message);
		logger.error(message);
		throw new Error(message);
	}
};
exports.instantiateChaincode = instantiateChaincode;
