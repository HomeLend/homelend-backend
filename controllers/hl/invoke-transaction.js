/**
 * Copyright 2017 IBM All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
'use strict';
let path = require('path');
let fs = require('fs');
let util = require('util');
let hfc = require('fabric-client');
let Peer = require('fabric-client/lib/Peer.js');
let helper = require('./helper.js');
let { get } = require('lodash');
let logger = helper.getLogger('invoke-chaincode');
let EventHub = require('fabric-client/lib/EventHub.js');
let ORGS = hfc.getConfigSetting('network-config');

let invokeChaincode = function (peerNames, channelName, chaincodeName, fcn, args, org, username, password, key, certificate, options = { returnUser: false }) {
    logger.debug(util.format('\n============ invoke transaction on organization %s ============\n', org));
    let client = helper.getClientForOrg(org);
    let channel = helper.getChannelForOrg(org);
    let targets = (peerNames) ? helper.newPeers(peerNames, org) : undefined;
    let tx_id = null;
    let userHash = '';
    let errMsg = null;
    return helper.enrollUser(org, username, password, key, certificate).then((user) => {
        tx_id = client.newTransactionID();
        logger.debug(util.format('Sending transaction "%j"', tx_id));
        // send proposal to endorser
        let request = {
            chaincodeId: chaincodeName,
            chaincodeVersion: 'v1',
            fcn: fcn,
            args: args,
            chainId: channelName,
            txId: tx_id
        };

        if (targets)
            request.targets = targets;

        return channel.sendTransactionProposal(request);
    }, (err) => {
        logger.error('Failed to enroll user \'' + username + '\'. ' + err);
        throw new Error('Failed to enroll user \'' + username + '\'. ' + err);
    }).then((results) => {
        if (results == null || results[0] == null)
            throw new Error('Results = null !');

        let proposalResponses = results[0];
        if (results != null && results[0] != null && results[0][0] != null && results[0][0].message != null) {
            errMsg = results[0][0].message;
            console.log('results', fcn, args, results)
        }

        userHash = get(results, '0.0.response.payload');
        if (userHash) userHash = userHash.toString();

        if (results[1] == null)
             throw new Error('Results[1] = null !');

        let proposal = results[1];
        let all_good = true;
        for (let i in proposalResponses) {
            let one_good = false;
            if (proposalResponses && proposalResponses[i].response &&
                proposalResponses[i].response.status === 200) {
                one_good = true;
                logger.info('transaction proposal was good');
            } else {
                logger.error('transaction proposal was bad');
            }
            all_good = all_good & one_good;
        }
        if (all_good) {
            logger.debug(util.format(
                'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s", metadata - "%s", endorsement signature: %s',
                proposalResponses[0].response.status, proposalResponses[0].response.message,
                proposalResponses[0].response.payload, proposalResponses[0].endorsement
                    .signature));
            let request = {
                proposalResponses: proposalResponses,
                proposal: proposal
            };
            // set the transaction listener and set a timeout of 30sec
            // if the transaction did not get committed within the timeout period,
            // fail the test
            let transactionID = tx_id.getTransactionID();
            let eventPromises = [];

            if (peerNames == null) {
                peerNames = channel.getPeers().map(function (peer) {
                    return peer.getName();
                });
            }

            let eventhubs = helper.newEventHubs(peerNames, org);
            if(eventhubs == null)
                throw new Error('eventhubs = null !');

            for (let key in eventhubs) {
                let eh = eventhubs[key];
                if(eh == null)
                     throw new Error('eh = null !');
                     
                eh.connect();
                let txPromise = new Promise((resolve, reject) => {
                    let wasResolved = false;

                    let handle = setTimeout(() => {
                        eh.disconnect();
                        if (!wasResolved) {
                            reject();
                        }
                    }, 30000);

                    eh.registerTxEvent(transactionID, (tx, code) => {
                        wasResolved = true;
                        clearTimeout(handle);
                        eh.unregisterTxEvent(transactionID);
                        eh.disconnect();

                        if (code !== 'VALID') {
                            logger.error(
                                'The balance transfer transaction was invalid, code = ' + code);
                            reject();
                        } else {
                            logger.info(
                                'The balance transfer transaction has been committed on peer ' +
                                eh._ep._endpoint.addr);
                            resolve();
                        }
                    });
                });
                eventPromises.push(txPromise);
            }

            let sendPromise = channel.sendTransaction(request);
            return Promise.all([sendPromise].concat(eventPromises)).then((results) => {
                logger.debug(' event promise all complete and testing complete');
                return results[0]; // the first returned value is from the 'sendPromise' which is from the 'sendTransaction()' call
            }).catch((err) => {
                logger.error(
                    'Failed to send transaction and get notifications within the timeout period. ' + err
                );
                return 'Failed to send transaction and get notifications within the timeout period. ' + err;
            });
        } else {
            logger.error(
                'Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...'
            );
            return 'Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...';
        }
    }, (err) => {
        logger.error('Failed to send proposal due to error: ' + err.stack ? err.stack :
            err);
        return 'Failed to send proposal due to error: ' + err.stack ? err.stack :
            err;
    }).then((response) => {
        if (response.status === 'SUCCESS') {
            logger.info('Successfully sent transaction to the orderer.');
            if (options['returnUser'])
                return {
                    txId: tx_id.getTransactionID(),
                    userHash,
                    status: 200
                };
            else
                return { status: 200, txId: tx_id.getTransactionID() };
        } else {
            logger.error('Failed to order the transaction. Error: ' + response + ' errMsg ' + errMsg);
            return { status: 500, err: 'Failed to order the transaction. Error: ' + response + ' errMsg ' + errMsg };
        }
    }, (err) => {
        logger.error('Failed to send transaction due to error: ' + err.stack ? err + ' errMsg ' + errMsg
            .stack : err);
        return { status: 500, err: 'Failed to send transaction due to error: ' + (err.stack ? err.stack : err) + ' errMsg ' + errMsg };
    });
};

function timeout(duration) { // Thanks joews
    return new Promise(function (resolve) {
        setTimeout(resolve, duration);
    });
}

exports.invokeChaincode = invokeChaincode;