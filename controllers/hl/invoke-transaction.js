'use strict';
const path = require('path');
const fs = require('fs');
const util = require('util');
const hfc = require('fabric-client');
const helper = require('./helper.js');
const logger = helper.getLogger('invoke-chaincode');

const invokeChaincode = function (peerUrls, channelName, chaincodeName, fcn, args, username, org_name) {
    logger.debug(util.format('\n============ invoke transaction on channel %s ============\n', channelName));
    let error_message = null;
    let eventhubs_in_use = [];
    let tx_id_string = null;
    try {
        // first setup the client for this org
        const client = helper.getClientForOrg(org_name, username);
        logger.debug('Successfully got the fabric client for the organization "%s"', org_name);
        const channel = client.getChannel(channelName);
        if (!channel) {
            let message = util.format('Channel %s was not defined in the connection profile', channelName);
            logger.error(message);
            throw new Error(message);
        }
        const tx_id = client.newTransactionID();
        // will need the transaction ID string for the event registration later
        tx_id_string = tx_id.getTransactionID();

        // send proposal to endorser
        const request = {
            chaincodeId: chaincodeName,
            fcn: fcn,
            args: args,
            chainId: channelName,
            txId: tx_id
        };

        let results = channel.sendTransactionProposal(request);

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
                logger.info('invoke chaincode proposal was good');
            } else {
                logger.error('invoke chaincode proposal was bad');
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
            event_hubs.forEach((eh) => {
                logger.debug('invokeEventPromise - setting up event');
                let invokeEventPromise = new Promise((resolve, reject) => {
                    let event_timeout = setTimeout(() => {
                        let message = 'REQUEST_TIMEOUT:' + eh._ep._endpoint.addr;
                        logger.error(message);
                        eh.disconnect();
                        reject(new Error(message));
                    }, 3000);
                    eh.registerTxEvent(tx_id_string, (tx, code) => {
                        logger.info('The chaincode invoke chaincode transaction has been committed on peer %s', eh._ep._endpoint.addr);
                        clearTimeout(event_timeout);
                        eh.unregisterTxEvent(tx_id_string);

                        if (code !== 'VALID') {
                            let message = until.format('The invoke chaincode transaction was invalid, code:%s', code);
                            logger.error(message);
                            reject(new Error(message));
                        } else {
                            let message = 'The invoke chaincode transaction was valid.';
                            logger.info(message);
                            resolve(message);
                        }
                    }, (err) => {
                        clearTimeout(event_timeout);
                        eh.unregisterTxEvent(tx_id_string);
                        let message = 'Problem setting up the event hub :' + err.toString();
                        logger.error(message);
                        reject(new Error(message));
                    });
                });
                promises.push(invokeEventPromise);
                eh.connect();
                eventhubs_in_use.push(eh);
            });

            const orderer_request = {
                txId: tx_id,
                proposalResponses: proposalResponses,
                proposal: proposal
            };
            const sendPromise = channel.sendTransaction(orderer_request);
            // put the send to the orderer last so that the events get registered and
            // are ready for the orderering and committing
            promises.push(sendPromise);
            let results = Promise.all(promises);
            logger.debug(util.format('------->>> R E S P O N S E : %j', results));
            let response = results.pop(); //  orderer results are last in the results
            if (response.status === 'SUCCESS') {
                logger.info('Successfully sent transaction to the orderer.');
            } else {
                error_message = util.format('Failed to order the transaction. Error code: %s', response.status);
                logger.debug(error_message);
            }

            // now see what each of the event hubs reported
            for (let i in results) {
                let event_hub_result = results[i];
                let event_hub = event_hubs[i];
                logger.debug('Event results for event hub :%s', event_hub._ep._endpoint.addr);
                if (typeof event_hub_result === 'string') {
                    logger.debug(event_hub_result);
                } else {
                    if (!error_message) error_message = event_hub_result.toString();
                    logger.debug(event_hub_result.toString());
                }
            }
        } else {
            error_message = util.format('Failed to send Proposal and receive all good ProposalResponse');
            logger.debug(error_message);
        }
    } catch (error) {
        logger.error('Failed to invoke due to error: ' + error.stack ? error.stack : error);
        error_message = error.toString();
    }

    // need to shutdown open event streams
    eventhubs_in_use.forEach((eh) => {
        eh.disconnect();
    });

    if (!error_message) {
        let message = util.format(
            'Successfully invoked the chaincode %s to the channel \'%s\'',
            org_name, channelName);
        logger.info(message);
        return tx_id_string;
    } else {
        let message = util.format('Failed to invoke chaincode. cause:%s', error_message);
        logger.error(message);
        throw new Error(message);
    }
};

exports.invokeChaincode = invokeChaincode;
