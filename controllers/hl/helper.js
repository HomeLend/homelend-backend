/**
 * Copyright 2017 IBM All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an 'AS IS' BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
'use strict';
var log4js = require('log4js');
var logger = log4js.getLogger('Helper');
//console.log(logger);
// logger.setLevel('DEBUG');

var path = require('path');
var util = require('util');
var fs = require('fs-extra');
var User = require('fabric-client/lib/User.js');
var crypto = require('crypto');
var copService = require('fabric-ca-client');
const config = require('config');
var hfc = require('fabric-client');
hfc.addConfigFile(path.join(__dirname, "network-config.json"));
hfc.setLogger(logger);
var ORGS = hfc.getConfigSetting('network-config');

var clients = {};
var channels = {};
var caClients = {};

let cryptoSuite;

// set up the client and channel objects for each org
for (let key in ORGS) {
    if (key.indexOf('org') === 0) {
        let client = new hfc();

        cryptoSuite = hfc.newCryptoSuite();
        cryptoSuite.setCryptoKeyStore(hfc.newCryptoKeyStore({path: getKeyStoreForOrg(ORGS[key].name)}));
        client.setCryptoSuite(cryptoSuite);

        let channel = client.newChannel('mainchannel');
        channel.addOrderer(newOrderer(client));

        clients[key] = client;
        channels[key] = channel;

        setupPeers(channel, key, client);
        let caUrl = ORGS[key].ca;
        caClients[key] = new copService(caUrl, null /*defautl TLS opts*/, '' /* default CA */, cryptoSuite);
    }
}

function setupPeers(channel, org, client) {
    for (let key in ORGS[org].peers) {
        let data = fs.readFileSync(path.join(__dirname, ORGS[org].peers[key]['tls_cacerts']));
        let peer = client.newPeer(
            ORGS[org].peers[key].requests,
            {
                pem: Buffer.from(data).toString(),
                'ssl-target-name-override': ORGS[org].peers[key]['server-hostname']
            }
        );
        peer.setName(key);

        channel.addPeer(peer);
    }
}

function newOrderer(client) {
    var caRootsPath = ORGS.orderer.tls_cacerts;
    let data = fs.readFileSync(path.join(__dirname, caRootsPath));
    let caroots = Buffer.from(data).toString();
    return client.newOrderer(ORGS.orderer.url, {
        'pem': caroots,
        'ssl-target-name-override': ORGS.orderer['server-hostname']
    });
}

function readAllFiles(dir) {
    var files = fs.readdirSync(dir);
    var certs = [];
    files.forEach((file_name) => {
        let file_path = path.join(dir, file_name);
        let data = fs.readFileSync(file_path);
        certs.push(data);
    });
    return certs;
}

function getOrgName(org) {
    return ORGS[org].name;
}

function getKeyStoreForOrg(org) {
    if (path.sep === "\\") {
        return config.get('keyValueStoreWindows') + '_' + org;
    } else {
        return config.get('keyValueStore') + '_' + org;
    }
}

function newRemotes(names, forPeers, userOrg) {
    let client = getClientForOrg(userOrg);

    let targets = [];
    // find the peer that match the names
    for (let idx in names) {
        let peerName = names[idx];
        if (ORGS[userOrg].peers[peerName]) {
            // found a peer matching the name
            let data = fs.readFileSync(path.join(__dirname, ORGS[userOrg].peers[peerName]['tls_cacerts']));
            let grpcOpts = {
                pem: Buffer.from(data).toString(),
                'ssl-target-name-override': ORGS[userOrg].peers[peerName]['server-hostname']
            };

            if (forPeers) {
                targets.push(client.newPeer(ORGS[userOrg].peers[peerName].requests, grpcOpts));
            } else {
                let eh = client.newEventHub();
                eh.setPeerAddr(ORGS[userOrg].peers[peerName].events, grpcOpts);
                targets.push(eh);
            }
        }
    }

    if (targets.length === 0) {
        logger.error(util.format('Failed to find peers matching the names %s', names));
    }

    return targets;
}

//-------------------------------------//
// APIs
//-------------------------------------//
var getChannelForOrg = function (org) {
    return channels[org];
};

var getClientForOrg = function (org) {
    return clients[org];
};

var newPeers = function (names, org) {
    return newRemotes(names, true, org);
};

var newEventHubs = function (names, org) {
    return newRemotes(names, false, org);
};

var getMspID = function (org) {
    logger.debug('Msp ID : ' + ORGS[org].mspid);
    return ORGS[org].mspid;
};

var getAdminUser = function (userOrg) {
    var users = config.get('admins');
    var username = users[0].username;
    var password = users[0].secret;
    var member;
    var client = getClientForOrg(userOrg);

    return hfc.newDefaultKeyValueStore({
        path: getKeyStoreForOrg(getOrgName(userOrg))
    }).then((store) => {
        client.setStateStore(store);
        // clearing the user context before switching
        client._userContext = null;
        return client.getUserContext(username, true).then((user) => {
            if (user && user.isEnrolled()) {
                logger.info('Successfully loaded member from persistence');
                return user;
            } else {
                let caClient = caClients[userOrg];
                // need to enroll it with CA server
                return caClient.enroll({
                    enrollmentID: username,
                    enrollmentSecret: password
                }).then((enrollment) => {
                    logger.info('Successfully enrolled user \'' + username + '\'');
                    member = new User(username);
                    member.setCryptoSuite(client.getCryptoSuite());
                    return member.setEnrollment(enrollment.key, enrollment.certificate, getMspID(userOrg));
                }).then(() => {
                    return client.setUserContext(member);
                }).then(() => {
                    return member;
                }).catch((err) => {
                    logger.error('Failed to enroll and persist user. Error: ' + err.stack ?
                        err.stack : err);
                    return null;
                });
            }
        });
    });
};

//Register new user to blockchain
const registerUser = function (userOrg, username, affiliation, attrs, adminusername, adminpassword) {
    let usersecret;
    let defaultKVStore;
    const client = getClientForOrg(userOrg);
    const mspId = ORGS[userOrg].mspid;
    let member;
    return hfc.newDefaultKeyValueStore({
        path: getKeyStoreForOrg(getOrgName(userOrg))
    }).then((store) => {
        defaultKVStore = store;
        client.setStateStore(store);
        // clearing the user context before switching
        client._userContext = null;
        const caClient = caClients[userOrg];
        return enrollUser(userOrg, adminusername, adminpassword).then(function (adminUserObj) {
            console.log(adminUserObj);
            return caClient.register({
                enrollmentID: username,
                affiliation: affiliation,
                // attrs: attrs
            }, adminUserObj);
        }).then((secret) => {
            usersecret = secret;
            return caClient.enroll(
                {
                    enrollmentID: username,
                    enrollmentSecret: secret
                });
        }, (err) => {
            return err;
        });
    }).then((result) => {
        result.secret = usersecret;
        return result;
    }, (err) => {
        return err;
    });
};

//New method to enroll user in blockchain with password or with key and certificates if available
const enrollUser = function (userOrg, username, password, key, certificate) {
    const client = getClientForOrg(userOrg);
    return hfc.newDefaultKeyValueStore({
        path: getKeyStoreForOrg(getOrgName(userOrg))
    }).then((store) => {
        client.setStateStore(store);
        client._userContext = null;
        if (!key || !certficate) {
            return getUserWithEnroll(userOrg, username, password);
        }
        else {
            return getUserWithoutEnroll(userOrg, username, password, key, certificate);
        }
    }).then((user) => {
        return user;
    }, (err) => {
        return err;
    });
};

//Get registered user which is enrolled
const getUserWithoutEnroll = function (userOrg, username, password, key, certificate) {
    let member;
    const client = getClientForOrg(userOrg);
    let opts;
    if (cryptoSuite._cryptoKeyStore) {
        opts = {ephemeral: false};
    } else {
        opts = {ephemeral: true};
    }
    return cryptoSuite.importKey(key, opts)
        .then(function (privatekey) {
            return hfc.newDefaultKeyValueStore({
                path: getKeyStoreForOrg(getOrgName(userOrg))
            }).then((store) => {
                client.setStateStore(store);
                member = new User(username);
                member._enrollmentSecret = password;
                return member.setEnrollment(privatekey, certificate, getMspID(userOrg));
            }).then(() => {
                return client.setUserContext(member, true);
            }).then(() => {
                return member;
            });
        }, function (err) {
            return err;
        });
};

//Register new user
const getUserWithEnroll = function (userOrg, username, password) {
    let member;
    const client = getClientForOrg(userOrg);
    return hfc.newDefaultKeyValueStore({
        path: getKeyStoreForOrg(getOrgName(userOrg))
    }).then((store) => {
        client.setStateStore(store);
        // clearing the user context before switching
        client._userContext = null;
        const caClient = caClients[userOrg];
        // need to enroll it with CA server
        return caClient.enroll({
            enrollmentID: username,
            enrollmentSecret: password
        }).then((enrollment) => {
            member = new User(username);
            member.setCryptoSuite(client.getCryptoSuite());
            const buff = new Buffer(enrollment.key.toBytes());
            return member.setEnrollment(enrollment.key, enrollment.certificate, getMspID(userOrg));
        }).then(() => {
            return client.setUserContext(member, true);
        }).then(() => {
            return member;
        }).catch((err) => {
            return err;
        });
    }).catch((err) => {
        return err;
    });
};

var getRegisteredUsers = function (username, userOrg, isJson) {
    var member;
    var client = getClientForOrg(userOrg);
    var enrollmentSecret = null;
    return hfc.newDefaultKeyValueStore({
        path: getKeyStoreForOrg(getOrgName(userOrg))
    }).then((store) => {
        client.setStateStore(store);
        // clearing the user context before switching
        client._userContext = null;
        return client.getUserContext(username, true).then((user) => {
            if (user && user.isEnrolled()) {
                logger.info('Successfully loaded member from persistence');
                return user;
            } else {
                let caClient = caClients[userOrg];
                return getAdminUser(userOrg).then(function (adminUserObj) {
                    member = adminUserObj;
                    return caClient.register({
                        enrollmentID: username,
                        affiliation: userOrg + '.department1'
                    }, member);
                }).then((secret) => {
                    enrollmentSecret = secret;
                    logger.debug(username + ' registered successfully');
                    return caClient.enroll({
                        enrollmentID: username,
                        enrollmentSecret: secret
                    });
                }, (err) => {
                    logger.debug(username + ' failed to register');
                    return '' + err;
                    //return 'Failed to register '+username+'. Error: ' + err.stack ? err.stack : err;
                }).then((message) => {
                    if (message && typeof message === 'string' && message.includes(
                            'Error:')) {
                        logger.error(username + ' enrollment failed');
                        return message;
                    }
                    logger.debug(username + ' enrolled successfully');

                    member = new User(username);
                    member._enrollmentSecret = enrollmentSecret;
                    return member.setEnrollment(message.key, message.certificate, getMspID(userOrg));
                }).then(() => {
                    client.setUserContext(member);
                    return member;
                }, (err) => {
                    logger.error(util.format('%s enroll failed: %s', username, err.stack ? err.stack : err));
                    return '' + err;
                });
                ;
            }
        });
    }).then((user) => {

        if (isJson && isJson === true) {
            var response = {
                success: true,
                secret: user._enrollmentSecret,
                message: username + ' enrolled Successfully',
            };
            return response;
        }
        return user;
    }, (err) => {
        logger.error(util.format('Failed to get registered user: %s, error: %s', username, err.stack ? err.stack : err));
        return '' + err;
    });
};

var getOrgAdmin = function (userOrg) {
    var admin = ORGS[userOrg].admin;
    var keyPath = path.join(__dirname, admin.key);
    var keyPEM = Buffer.from(readAllFiles(keyPath)[0]).toString();
    var certPath = path.join(__dirname, admin.cert);
    var certPEM = readAllFiles(certPath)[0].toString();

    var client = getClientForOrg(userOrg);
    var cryptoSuite = hfc.newCryptoSuite();
    if (userOrg) {
        cryptoSuite.setCryptoKeyStore(hfc.newCryptoKeyStore({path: getKeyStoreForOrg(getOrgName(userOrg))}));
        client.setCryptoSuite(cryptoSuite);
    }

    return hfc.newDefaultKeyValueStore({
        path: getKeyStoreForOrg(getOrgName(userOrg))
    }).then((store) => {
        client.setStateStore(store);

        return client.createUser({
            username: 'peer' + userOrg + 'Admin',
            mspid: getMspID(userOrg),
            cryptoContent: {
                privateKeyPEM: keyPEM,
                signedCertPEM: certPEM
            }
        });
    });
};

var setupChaincodeDeploy = function () {
    process.env.GOPATH = path.join(__dirname, hfc.getConfigSetting('CC_SRC_PATH'));
};

var getLogger = function (moduleName) {
    var logger = log4js.getLogger(moduleName);
    // logger.setLevel('DEBUG');
    return logger;
};

const register = (org_name, email, attrs, dept, adminUsername, adminPassword) => {
    return registerUser(org_name, username, dept, attrs, adminUsername, adminPassword).then((result) => {
        const response = {};
        response.secret = result.secret;
        const buff = new Buffer(result.key.toBytes());
        response.key = buff.toString('utf8');
        response.certificate = result.certificate;
        response.rootCertificate = result.rootCertificate;
        return (response);
    });
};

exports.getChannelForOrg = getChannelForOrg;
exports.getClientForOrg = getClientForOrg;
exports.getLogger = getLogger;
exports.setupChaincodeDeploy = setupChaincodeDeploy;
exports.getMspID = getMspID;
exports.ORGS = ORGS;
exports.newPeers = newPeers;
exports.newEventHubs = newEventHubs;
exports.getRegisteredUsers = getRegisteredUsers;
exports.getOrgAdmin = getOrgAdmin;
exports.registerUser = registerUser;
exports.enrollUser = enrollUser;
exports.register = register;