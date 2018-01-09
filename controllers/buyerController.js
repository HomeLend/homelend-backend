const db = require('../lib/db');
const userModel = db.model('Users');
const propertyModel = db.model('Properties');
const httpStatus = require('http-status-codes');
const { invokeChaincode } = require('./hl/invoke-transaction');
const logger = require('../lib/logger');
const config = require('config');
const helper = require('./hl/helper');
const UsersCacheModel = db.model('UsersCache');
const chaincodeName = config.get('lending_chaincode');
const org_name = 'org_pocseller';
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

module.exports.buy = async (req, res) => {
    const { email, idNumber, idBase64, firstName, lastName } = req.body;
    const data = {
        PropertyHash: "test property hash",
    };
    const buyerData = {
        FirstName: firstName,
        LastName: lastName,
        Email: email,
        IDNumber: idNumber,
        IDBase64: idBase64,
        Timestamp: Date.now()
    };
    try {
        let currentUser = await UsersCacheModel.findOne({ email: email, type: 'buyer' });
    
        if (!currentUser) {
            currentUser = await helper.register(org_name, email, attrs, dept, adminUsername, adminPassword)

            if (!registerResult && !registerResult.secret) 
                throw ' Problem registering user'
            
            const user = await UsersCacheModel({
                email: email,
                password: registerResult.secret,
                type: 'buyer',
                key: registerResult.key,
                certificate: registerResult.certificate,
                rootCertificate: registerResult.rootCertificate
            }).save();
            
            if (!user) throw ' Problem saving the user'
            
            // Add user's personal info to the blockChain
            let response = await invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, 'putBuyerPersonalInfo', [JSON.stringify(buyerData)], org_name, email, registerResult.secret);
            if (!response) throw 'Problem saving the user inside blockchain'

            // Add a buy order
            response = await invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, 'buy', [JSON.stringify(data)], org_name, email, registerResult.secret)
            if (!response) throw 'Problem putting buyer\'s request'

            // If everything passed, return a normal response
            return res.status(200).send(response);
        }
        
        // If the user is already registered, just add a buy order
        let response = await invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, 'buy', [JSON.stringify(data)], org_name, email, currentUser.password)
        if (!response) throw 'Problem saving the user inside blockchain'
        
        return res.status(200).send(response);
    }
    catch(err) {
        return res.status(httpStatus.BAD_REQUEST).send({ err: err });
    }
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
    const email = req.body.email;
    UsersCacheModel.findOne({ email: email }).then((currentUser) => {
        if (!currentUser) {
            return res.status(httpStatus.BAD_REQUEST).send({ err: 'User not found' });
        }
        return invokeChaincode(['peer0'], config.get('channelName'), chaincodeName, 'pullBankOffers', [JSON.stringify({})], org_name, email, currentUser.password).then((response) => {
            return res.send(response);
        });
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
    invokeChaincode(['peer0'], config.get('channelName'), config.get('lending_chaincode'), 'putBuyerPersonalInfo', [JSON.stringify(body)], 'admin', 'org_pocseller').then((response) => {
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