const path = require('path');
const fs = require('fs');
const util = require('util');
const hfc = require('fabric-client');
const helper = require('./helper.js');
const logger = helper.getLogger('Query');

const queryChaincode = function (peers, channelName, chaincodeName, fcn, args, org_name, username, password, key, certificate) {
    // first setup the client for this org
    const client = helper.getClientForOrg(org_name, username);
    logger.debug('Successfully got the fabric client for the organization "%s"', org_name);
    var channel = helper.getChannelForOrg(org_name);
    var targets = (peers) ? helper.newPeers(peers, org_name) : undefined;
    if (!channel) {
        let message = util.format('Channel %s was not defined in the connection profile', channelName);
        logger.error(message);
        throw new Error(message);
    }
    return helper.enrollUser(org_name, username, password, key, certificate).then((user) => {
        // send query
        const request = {
            targets: targets, //queryByChaincode allows for multiple targets
            chaincodeId: chaincodeName,
            fcn: fcn,
            args: args
        };
        return channel.queryByChaincode(request).then((response_payloads) => {
            if (response_payloads) {
                // for (let i = 0; i < response_payloads.length; i++) {
                //     logger.info(args[0] + ' now has ' + response_payloads[i].toString('utf8') +
                //         ' after the move');
                //     return args[0] + ' now has ' + response_payloads[i].toString('utf8') +
                //         ' after the move';
                // }
                return response_payloads;
            } else {
                return null;
            }
        });
    }).catch((error) => {
        logger.error('Failed to query due to error: ' + error.stack ? error.stack : error);
        return error.toString();
    });
};

// const getBlockByNumber = function (peer, channelName, blockNumber, username, org_name) {
//     try {
//         // first setup the client for this org
//         const client = await helper.getClientForOrg(org_name, username);
//         logger.debug('Successfully got the fabric client for the organization "%s"', org_name);
//         const channel = client.getChannel(channelName);
//         if (!channel) {
//             let message = util.format('Channel %s was not defined in the connection profile', channelName);
//             logger.error(message);
//             throw new Error(message);
//         }
//
//         let response_payload = await channel.queryBlock(parseInt(blockNumber, peer));
//         if (response_payload) {
//             logger.debug(response_payload);
//             return response_payload;
//         } else {
//             logger.error('response_payload is null');
//             return 'response_payload is null';
//         }
//     } catch (error) {
//         logger.error('Failed to query due to error: ' + error.stack ? error.stack : error);
//         return error.toString();
//     }
// };
// const getTransactionByID = async function (peer, channelName, trxnID, username, org_name) {
//     try {
//         // first setup the client for this org
//         const client = await helper.getClientForOrg(org_name, username);
//         logger.debug('Successfully got the fabric client for the organization "%s"', org_name);
//         const channel = client.getChannel(channelName);
//         if (!channel) {
//             let message = util.format('Channel %s was not defined in the connection profile', channelName);
//             logger.error(message);
//             throw new Error(message);
//         }
//
//         let response_payload = await channel.queryTransaction(trxnID, peer);
//         if (response_payload) {
//             logger.debug(response_payload);
//             return response_payload;
//         } else {
//             logger.error('response_payload is null');
//             return 'response_payload is null';
//         }
//     } catch (error) {
//         logger.error('Failed to query due to error: ' + error.stack ? error.stack : error);
//         return error.toString();
//     }
// };
// const getBlockByHash = async function (peer, channelName, hash, username, org_name) {
//     try {
//         // first setup the client for this org
//         const client = await helper.getClientForOrg(org_name, username);
//         logger.debug('Successfully got the fabric client for the organization "%s"', org_name);
//         const channel = client.getChannel(channelName);
//         if (!channel) {
//             let message = util.format('Channel %s was not defined in the connection profile', channelName);
//             logger.error(message);
//             throw new Error(message);
//         }
//
//         let response_payload = await channel.queryBlockByHash(Buffer.from(hash), peer);
//         if (response_payload) {
//             logger.debug(response_payload);
//             return response_payload;
//         } else {
//             logger.error('response_payload is null');
//             return 'response_payload is null';
//         }
//     } catch (error) {
//         logger.error('Failed to query due to error: ' + error.stack ? error.stack : error);
//         return error.toString();
//     }
// };
// const getChainInfo = async function (peer, channelName, username, org_name) {
//     try {
//         // first setup the client for this org
//         const client = await helper.getClientForOrg(org_name, username);
//         logger.debug('Successfully got the fabric client for the organization "%s"', org_name);
//         const channel = client.getChannel(channelName);
//         if (!channel) {
//             let message = util.format('Channel %s was not defined in the connection profile', channelName);
//             logger.error(message);
//             throw new Error(message);
//         }
//
//         let response_payload = await channel.queryInfo(peer);
//         if (response_payload) {
//             logger.debug(response_payload);
//             return response_payload;
//         } else {
//             logger.error('response_payload is null');
//             return 'response_payload is null';
//         }
//     } catch (error) {
//         logger.error('Failed to query due to error: ' + error.stack ? error.stack : error);
//         return error.toString();
//     }
// };
// //getInstalledChaincodes
// const getInstalledChaincodes = async function (peer, channelName, type, username, org_name) {
//     try {
//         // first setup the client for this org
//         const client = await helper.getClientForOrg(org_name, username);
//         logger.debug('Successfully got the fabric client for the organization "%s"', org_name);
//
//         let response = null
//         if (type === 'installed') {
//             response = await client.queryInstalledChaincodes(peer, true); //use the admin identity
//         } else {
//             const channel = client.getChannel(channelName);
//             if (!channel) {
//                 let message = util.format('Channel %s was not defined in the connection profile', channelName);
//                 logger.error(message);
//                 throw new Error(message);
//             }
//             response = await channel.queryInstantiatedChaincodes(peer, true); //use the admin identity
//         }
//         if (response) {
//             if (type === 'installed') {
//                 logger.debug('<<< Installed Chaincodes >>>');
//             } else {
//                 logger.debug('<<< Instantiated Chaincodes >>>');
//             }
//             const details = [];
//             for (let i = 0; i < response.chaincodes.length; i++) {
//                 logger.debug('name: ' + response.chaincodes[i].name + ', version: ' +
//                     response.chaincodes[i].version + ', path: ' + response.chaincodes[i].path
//                 );
//                 details.push('name: ' + response.chaincodes[i].name + ', version: ' +
//                     response.chaincodes[i].version + ', path: ' + response.chaincodes[i].path
//                 );
//             }
//             return details;
//         } else {
//             logger.error('response is null');
//             return 'response is null';
//         }
//     } catch (error) {
//         logger.error('Failed to query due to error: ' + error.stack ? error.stack : error);
//         return error.toString();
//     }
// };
// const getChannels = async function (peer, username, org_name) {
//     try {
//         // first setup the client for this org
//         const client = await helper.getClientForOrg(org_name, username);
//         logger.debug('Successfully got the fabric client for the organization "%s"', org_name);
//
//         let response = await client.queryChannels(peer);
//         if (response) {
//             logger.debug('<<< channels >>>');
//             const channelNames = [];
//             for (let i = 0; i < response.channels.length; i++) {
//                 channelNames.push('channel id: ' + response.channels[i].channel_id);
//             }
//             logger.debug(channelNames);
//             return response;
//         } else {
//             logger.error('response_payloads is null');
//             return 'response_payloads is null';
//         }
//     } catch (error) {
//         logger.error('Failed to query due to error: ' + error.stack ? error.stack : error);
//         return error.toString();
//     }
// };

exports.queryChaincode = queryChaincode;
// exports.getBlockByNumber = getBlockByNumber;
// exports.getTransactionByID = getTransactionByID;
// exports.getBlockByHash = getBlockByHash;
// exports.getChainInfo = getChainInfo;
// exports.getInstalledChaincodes = getInstalledChaincodes;
// exports.getChannels = getChannels;
