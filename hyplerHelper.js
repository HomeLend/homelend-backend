const db = require('./lib/db');
const invokeChaincode = require('./controllers/hl/invoke-transaction');
const queryChaincode = require('./controllers/hl/query');
const logger = require('./lib/logger');
const config = require('config');
const helper = require('./controllers/hl/helper');
const UsersCacheModel = db.model('UsersCache');
const httpStatus = require('http-status-codes');
const chaincodeName = config.get('lending_chaincode');
const [adminUsername, adminPassword] = [config.admins[0].username, config.admins[0].secret];

exports.runMethodWithIdentity = async (methodName, data, emailSrc, userType, org_name) => {
    try {
        const email = String(emailSrc).toLowerCase();
        const currentUser = await UsersCacheModel.findOne({ email: email, type: userType });
        if (!currentUser)
            return { status: httpStatus.BAD_REQUEST, err: 'User not found' };

        const response = await invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'),
            chaincodeName, methodName, data, org_name, email, currentUser.password);
        return response;
    } catch (err) {
        return { status: httpStatus.INTERNAL_SERVER_ERROR, err }
    }
};

exports.runMethodAndRegister = async (methodName, registerMethodName, data, userData, email, org_name, userType, attrs, dept) => {

    try {
        email = String(email).toLowerCase();
        let currentUser = await UsersCacheModel.findOne({ email, type: userType });
        if (!currentUser) {
            const registerResult = await helper.register(org_name, email, attrs, dept, adminUsername, adminPassword);
            if (!registerResult && !registerResult.secret) throw 'Problem registering user';
            const user = await UsersCacheModel({
                email, email,
                password: registerResult.secret,
                key: registerResult.key,
                type: userType,
                certificate: registerResult.certificate,
                rootCertificate: registerResult.rootCertificate,
            }).save();
            if (!user) throw 'Problem saving the user';
            currentUser = user;
            if (registerMethodName != null) {
                let response = await invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, registerMethodName, userData, org_name, email, currentUser.password, null, null, { returnUser: true })
                if (response.status != httpStatus.OK)
                    return response;
            }
        }
        if (registerMethodName == null)
            return { status: httpStatus.OK };

        let response = await invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, methodName, data, org_name, email, currentUser.password, null, null, { returnUser: true })
        return response;
    } catch (err) {
        return { status: httpStatus.INTERNAL_SERVER_ERROR, err: err.message }
    }
};

exports.register = async (email, methodName, userData, org_name, userType, attrs, dept) => {

    try {
        let currentUser = await UsersCacheModel.findOne({ email, type: userType });
        if (!currentUser) {
            const registerResult = await helper.register(org_name, email, attrs, dept, adminUsername, adminPassword);
            if (!registerResult && !registerResult.secret) throw 'Problem registering user';
            const user = await UsersCacheModel({
                email, email,
                password: registerResult.secret,
                key: registerResult.key,
                type: userType,
                certificate: registerResult.certificate,
                rootCertificate: registerResult.rootCertificate,
            }).save();
            if (!user) throw 'Problem saving the user';
            currentUser = user;
            let response = await invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, methodName, [JSON.stringify(userData)], org_name, email, currentUser.password, null, null, { returnUser: true })
            return response;
        }
        else
            return { status: httpStatus.BAD_REQUEST, err: 'user already registered' };

    } catch (err) {
        return { status: httpStatus.INTERNAL_SERVER_ERROR, err: err.message }
    }
};


exports.runQueryWithIdentity = async (email, queryName, userType, org_name) => {
    try {
        const currentUser = await UsersCacheModel.findOne({ email: email, type: userType });
        if (!currentUser) {
            return { status: httpStatus.BAD_REQUEST, err: 'User not found' };
        }

        result = await queryChaincode.queryChaincode(['peer0'], config.get('channelName'), chaincodeName, queryName, [JSON.stringify({})], org_name, email, currentUser.password);
        if (!result)
            throw 'Not a proper response for ' + queryName

        let ret = result[0].toString('utf8');
        if (ret == "")
            ret = "{}";
        return { status: httpStatus.OK, data: JSON.parse(ret) };
    } catch (err) {
        return { status: httpStatus.INTERNAL_SERVER_ERROR, err: err.message };
    }
};

exports.runQueryWithCredentials = async (queryName, userType, org_name, user, password) => {
    try {
        result = await queryChaincode.queryChaincode(['peer0'], config.get('channelName'), chaincodeName, queryName, [JSON.stringify({})], org_name, user, password);
        if (!result)
            throw 'Not a proper response for ' + queryName

        let ret = result[0].toString('utf8');
        if (ret == "")
            ret = "{}";
        return { status: httpStatus.OK, data: JSON.parse(ret) };
    } catch (err) {
        return { status: httpStatus.INTERNAL_SERVER_ERROR, err: err.message };
    }
};