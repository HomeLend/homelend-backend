const db = require('../lib/db');
const userModel = db.model('Users');
const propertyModel = db.model('Properties');
const httpStatus = require('http-status-codes');
const invokeChaincode = require('./hl/invoke-transaction');
const logger = require('../lib/logger');
const config = require('config');
const helper = require('./hl/helper');

const UsersCacheModel = db.model('UsersCache');


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


module.exports.buy = (req, res) => {
    const body = req.body;
    body.Timestamp = Date.now();

    const email = req.body.email;

    const data = {
        PropertyHash : "ddfdfd",
    }

    UsersCacheModel.findOne({ email: email }).then((currentUser) => {
        if (!currentUser) {
            registerBuyer(email).then((registerResult) => {
                UsersCacheModel({
                    email: email,
                    password: registerResult.secret
                }).save().then((saveResult) => {
                    invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), config.get('lending_chaincode'), 'buy', [JSON.stringify(PropertyHash)], 'org_pocseller', email, registerResult.secret).then((response) => {
                        return res.status(200).send(response);
                    });
                }).catch((err) => {
                    return res.status(500).send(err);
                });
            });
        }
        else {
            invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), config.get('lending_chaincode'), 'buy', [JSON.stringify(PropertyHash)], 'org_pocseller', currentUser.email, currentUser.password).then((response) => {
                return res.status(200).send(response);
            });

        }
    });
}

const registerBuyer = (email) => {
    const username = email;
    const org = 'org_pocbuyer';
    const isJSON = true;
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
    return helper.registerUser(org, username, dept, attrs, adminUsername, adminPassword).then((result) => {
        console.log(result);
        const response = {};
        response.secret = result.secret;
        const buff = new Buffer(result.key.toBytes());
        response.key = buff.toString('utf8');
        response.certificate = result.certificate;
        response.rootCertificate = result.rootCertificate;
        //     return response;
        // }).catch((err) => {
        //     console.log(err);
        // });
        return (response);
    }).catch(err => {
        return null;
        //return res.status(httpStatus.BAD_REQUEST).send(err);
    });
}



/**
 * Function inserts buyer's personal info
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {undefined}
 *
 * @param {String} req.body.ID
 * @param {String} req.body.FirstName
 * @param {String} req.body.LastName
 * @param {String} req.body.IDNumber
 * @param {String} req.body.IDBase64
 * @param {string} req.body.SalaryBase64
 *
 */

module.exports.putBuyerPersonalInfo = (req, res) => {
    const body = req.body;
    body.Timestamp = Date.now();
    invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), config.get('lending_chaincode'), 'putBuyerPersonalInfo', [JSON.stringify(body)], 'admin', 'org_pocseller').then((response) => {
        return res.send(response);
    }).catch((err) => {
        console.log(err);
    });
};


/**
 * Function returns list of offers from the bank
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {undefined}
 *
 */

module.exports.pullBankOffers = (req, res) => {
    const body = {};
    invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), config.get('lending_chaincode'), 'pullBankOffers', [JSON.stringify(body)], 'admin', 'org_pocseller').then((response) => {
        return res.send(response);
    }).catch((err) => {
        console.log(err);
    });
};


module.exports.confirm = (req, res) => {
    const _id = req.body.propertyHash;
    const creditScore = req.body.creditScore;
    const body = {
        _id: _id,
        creditScore: creditScore,
        status: 'CREDIT_SCORE_CONFIRMED',
        txHash: '12321213213212321312',
    };
    return res.send(body);
};

module.exports.decline = (req, res) => {
    return {
        _id: req.decoded._id,
        txHash: '12312321312213123231',
        status: 'DECLINED',
    };
};

module.exports.uploadDocuments = (req, res) => {
    const body = {};
    invokeChaincode.invokeChaincode(['peer0'], config.get('channelName'), config.get('lending_chaincode'), 'putBuyerPersonalInfo', [JSON.stringify(body)], 'admin', 'org_pocseller').then((response) => {
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
    return res.send([{
        name: 'asdad',
        address: 'asdada'
    }]);
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

module.exports.chooseAppraiser = (req, res) => {
    const appraiserId = req.body.appraiserId;

    return res.send({
        name: 'adssa',
        status: 'APPRAISER_CHOSEN'
    });
};

module.exports.acceptOfferFromInsurance = (req, res) => {
    const insuranceId = req.body.insuranceId;

    return res.send({
        txHash: 'asdadad',
        status: 'INSURANCE_OFFER_ACCEPTED',
        chaincodeAddress: '1231'
    });
};

const fetchAssetsForSale = () => [{
    hash: '123',
    address: "711-2880 Nulla St. Mankato Mississippi 96522",
    price: 1000000,
    sellerIdnumber: '300019239'
},
{
    hash: '111',
    address: "P.O. Box 283 8562 Fusce Rd. Azusa New York 39531",
    price: 2000000,
    sellerIdnumber: '201327616'
}
];

module.exports.fetchAssetsForSale = fetchAssetsForSale;

/**
 *
 * @param req
 * @param res
 *
 */
module.exports.getAllAssets4Sale = (req, res) => {
    return res.send(fetchAssetsForSale());
};