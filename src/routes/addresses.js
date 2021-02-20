/**
 * Created by Drew Lemmy, 2016-2021
 *
 * This file is part of Krist.
 *
 * Krist is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Krist is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Krist. If not, see <http://www.gnu.org/licenses/>.
 *
 * For more project information, see <https://github.com/tmpim/krist>.
 */

const krist               = require("./../krist.js");
const addresses           = require("./../addresses.js");
const addressesController = require("./../controllers/addresses.js");
const namesController     = require("./../controllers/names.js");
const txController        = require("./../controllers/transactions.js");
const tx                  = require("./../transactions.js");
const utils               = require("./../utils.js");
const moment              = require("moment");

module.exports = function(app) {
  /**
	 * @apiDefine AddressGroup Addresses
	 *
	 * All Address related endpoints.
	 */

  /**
	 * @apiDefine Address
	 *
	 * @apiSuccess {Object} address
	 * @apiSuccess {String} address.address The address.
	 * @apiSuccess {Number} address.balance The amount of Krist currently owned by this address.
	 * @apiSuccess {Number} address.totalin The total amount of Krist that has ever gone into this address.
	 * @apiSuccess {Number} address.totalout The total amount of Krist that has ever gone out of this address.
	 * @apiSuccess {Date} address.firstseen The date this address was first seen (when the first transaction to it was made).
	 */

  /**
	 * @apiDefine Addresses
	 *
	 * @apiSuccess {Object[]} addresses
	 * @apiSuccess {String} addresses.address The address.
	 * @apiSuccess {Number} addresses.balance The amount of Krist currently owned by this address.
	 * @apiSuccess {Number} addresses.totalin The total amount of Krist that has ever gone into this address.
	 * @apiSuccess {Number} addresses.totalout The total amount of Krist that has ever gone out of this address.
	 * @apiSuccess {Date} addresses.firstseen The date this address was first seen (when the first transaction to it was made).
	 */

  app.get("/", async function(req, res, next) {
    if (req.query.getbalance) {
      const address = await addresses.getAddress(req.query.getbalance);
      if (address) {
        res.send(address.balance.toString());
      } else {
        res.send("0");
      }

      return;
    }

    if (req.query.alert) {
      const from = krist.makeV2Address(req.query.alert);

      const address = await addresses.getAddress(from);
      if (address) {
        res.send(address.alert);
      } else {
        res.send("");
      }

      return;
    }

    if (typeof req.query.richapi !== "undefined") {
      const results = await addresses.getRich();
      let out = "";

      results.rows.forEach(function(address) {
        out += address.address.substr(0, 10);
        out += utils.padDigits(address.balance, 8);
        out += moment(address.firstseen).format("DD MMM YYYY");
      });

      res.send(out);

      return;
    }

    if (req.query.listtx) {
      const address = await addresses.getAddress(req.query.listtx);
      if (address) {
        const results = tx.getTransactionsByAddress(address.address, typeof req.query.overview !== "undefined" ? 3 : 500, 0, true);
        let out = "";

        results.rows.forEach(function (transaction) {
          out += moment(transaction.time).format("MMM DD HH:mm");

          let peer = "";
          let sign = "";

          if (transaction.to === address.address) {
            peer = transaction.from;
            sign = "+";
          } else if (transaction.from === address.address) {
            peer = transaction.to;
            sign = "-";
          }

          if (!transaction.from || transaction.from.length < 10) {
            peer = "N/A(Mined)";
          }

          if (!transaction.to || transaction.to.length < 10) {
            peer = "N/A(Names)";
          }

          out += peer;
          out += sign;
          out += utils.padDigits(transaction.value, 8);

          if (typeof req.query.id !== "undefined") {
            out += utils.padDigits(transaction.id, 8);
          }
        });

        out += "end";

        res.send(out);
      } else {
        res.send("Error4");
      }

      return;
    }


    next();
  });

  /**
	 * @api {get} /addresses List all addresses
	 * @apiName GetAddresses
	 * @apiGroup AddressGroup
	 * @apiVersion 2.0.0
	 *
	 * @apiParam (QueryParameter) {Number} [limit=50] The maximum amount of results to return.
	 * @apiParam (QueryParameter) {Number} [offset=0] The amount to offset the results.
	 *
	 * @apiSuccess {Number} count The count of results.
	 * @apiSuccess {Number} total The total count of addresses.
	 * @apiUse Addresses
	 *
	 * @apiSuccessExample {json} Success
	 *      {
	 *  	    "ok": true,
	 *  	    "count": 50,
	 *  	    "total": 500,
	 *  	    "addresses": [
	 *  	        {
	 *  	            "address": "0000000000",
	 *  	            "balance": 0,
	 *  	            "totalin": 50,
	 *  	            "totalout": 50,
	 *  	            "firstseen": "2015-02-14T16:44:40.000Z"
	 *  	        },
	 *  	        {
	 *  	            "address": "a5dfb396d3",
	 *  	            "balance": 30000,
	 *  	            "totalin": 100000,
	 *  	            "totalout": 130000,
	 *  	            "firstseen": "2015-02-14T20:42:30.000Z"
	 *  	        },
	 *  	        ...
	 */
  app.get("/addresses", async function(req, res) {
    try {
      const results = await addressesController.getAddresses(req.query.limit, req.query.offset);
      const addresses = [];

      results.rows.forEach(address => addresses.push(addressesController.addressToJSON(address)));

      res.json({
        ok: true,
        count: addresses.length,
        total: results.count,
        addresses
      });
    } catch(error) {
      utils.sendErrorToRes(req, res, error);
    }
  });

  app.post("/addresses/alert", async function(req, res) {
    try {
      const alert = await addressesController.getAlert(req.body.privatekey);
      res.json({
        ok: true,
        alert
      });
    } catch(error) {
      utils.sendErrorToRes(req, res, error);
    }
  });

  /**
	 * @api {get} /addresses/rich List the richest addresses
	 * @apiName GetRichAddresses
	 * @apiGroup AddressGroup
	 * @apiVersion 2.0.0
	 *
	 * @apiParam (QueryParameter) {Number} [limit=50] The maximum amount of results to return.
	 * @apiParam (QueryParameter) {Number} [offset=0] The amount to offset the results.
	 *
	 * @apiSuccess {Number} count The count of results.
	 * @apiSuccess {Number} total The total count of addresses.
	 * @apiUse Addresses
	 *
     * @apiSuccessExample {json} Success
	 *      {
	 *          "ok": true,
	 *          "count": 50,
	 *          "total": 500,
	 *          "addresses": [
	 *              {
	 *                  "address": "k2sdlnjo1m",
	 *                  "balance": 762010,
	 *                  "totalin": 11316,
	 *                  "totalout": 783984,
	 *                  "firstseen": "2016-01-24T05:08:14.000Z"
	 *              },
	 *              {
	 *                  "address": "k7u9sa6vbf",
	 *                  "balance": 505832,
	 *                  "totalin": 547785,
	 *                  "totalout": 41953,
	 *                  "firstseen": "2015-03-05T04:50:40.000Z"
	 *              },
	 *              ...
	 */
  app.get("/addresses/rich", async function(req, res) {
    try {
      const results = await addressesController.getRich(req.query.limit, req.query.offset);
      const addresses = [];

      results.rows.forEach(address => addresses.push(addressesController.addressToJSON(address)));

      res.json({
        ok: true,
        count: addresses.length,
        total: results.count,
        addresses
      });
    } catch(error) {
      utils.sendErrorToRes(req, res, error);
    }
  });

  /**
	 * @api {get} /addresses/:address Get an address
	 * @apiName GetAddress
	 * @apiGroup AddressGroup
	 * @apiVersion 2.0.0
	 *
	 * @apiParam (URLParameter) {String} address The address.
	 *
	 * @apiSuccess {Number} count The count of results.
	 * @apiUse Address
	 *
	 * @apiSuccessExample {json} Success
	 * {
	 *     "ok": true,
	 *     "address": {
	 *         "address": "kre3w0i79j",
	 *         "balance": 86945,
	 *         "totalin": 123364,
	 *         "totalout": 38292,
	 *         "firstseen": "2015-03-13T12:55:18.000Z"
	 *     }
	 * }
	 *
	 * @apiErrorExample {json} Address Not Found
	 * {
	 *     "ok": false,
	 *     "error": "address_not_found"
	 * }
	 *
	 * @apiErrorExample {json} Invalid Address
	 * {
	 *     "ok": false,
	 *     "error": "invalid_parameter",
	 *     "parameter": "address"
	 * }
	 */
  app.get("/addresses/:address", async function(req, res) {
    try {
      const address = await addressesController.getAddress(req.params.address);
      res.json({
        ok: true,
        address: addressesController.addressToJSON(address)
      });
    } catch(error) {
      utils.sendErrorToRes(req, res, error);
    }
  });


  /**
	 * @api {get} /addresses/:address/names Get all names registered to an address
	 * @apiName GetAddressNames
	 * @apiGroup AddressGroup
	 * @apiVersion 2.0.0
	 *
	 * @apiParam (URLParameter) {String} address The address.
	 *
	 * @apiParam (QueryParameter) {Number} [limit=50] The maximum amount of results to return.
	 * @apiParam (QueryParameter) {Number} [offset=0] The amount to offset the results.
	 *
	 * @apiSuccess {Number} count The count of results.
	 * @apiSuccess {Number} total The total amount of names owned by this address.
	 * @apiUse Names
	 *
	 * @apiSuccessExample {json} Success
	 * {
     *     "ok": true,
     *     "count": 8,
     *     "total": 8,
     *     "names": [
     *         {
     *             "name": "supercoolname",
     *             "owner": "kre3w0i79j",
     *             "registered": "2016-01-30T15:45:55.000Z",
     *             "updated": "2016-01-30T15:45:55.000Z",
     *             "a": null
     *         },
	 *
	 * @apiErrorExample {json} Address Not Found
	 * {
	 *     "ok": false,
	 *     "error": "address_not_found"
	 * }
	 *
	 * @apiErrorExample {json} Invalid Address
	 * {
	 *     "ok": false,
	 *     "error": "invalid_parameter",
	 *     "parameter": "address"
	 * }
	 */
  app.get("/addresses/:address/names", async function(req, res) {
    try {
      const names = await namesController.getNamesByAddress(req.params.address, req.query.limit, req.query.offset);
      const out = [];

      names.rows.forEach(name => out.push(namesController.nameToJSON(name)));

      res.json({
        ok: true,
        count: out.length,
        total: names.count,
        names: out
      });
    } catch(error) {
      utils.sendErrorToRes(req, res, error);
    }
  });

  /**
	 * @api {get} /addresses/:address/transactions Get the recent transactions from an address
	 * @apiName GetAddressTransactions
	 * @apiGroup AddressGroup
	 * @apiVersion 2.0.0
	 *
	 * @apiParam (URLParameter) {String} address The address.
	 *
	 * @apiParam (QueryParameter) {Number} [limit=50] The maximum amount of results to return.
	 * @apiParam (QueryParameter) {Number} [offset=0] The amount to offset the results.
	 * @apiParam (QueryParameter) {Boolean} [excludeMined] If specified, transactions from mining will be excluded.
	 *
	 * @apiSuccess {Number} count The count of results.
	 * @apiSuccess {Number} total The total amount of transactions this address has made.
	 * @apiUse Transactions
	 *
	 * @apiSuccessExample {json} Success
	 * {
     *     "ok": true,
     *     "count": 50,
     *     "total": 3799,
     *     "transactions": [
     *         {
     *             "id": 153197,
     *             "from": "kxxhsp1uzh",
     *             "to": "kre3w0i79j",
     *             "value": 75,
     *             "time": "2016-02-02T23:30:51.000Z",
     *             "name": null,
     *             "metadata": null,
     *             "type": "transfer"
     *         },
     *         {
     *             "id": 153196,
     *             "from": "kre3w0i79j",
     *             "to": "kxxhsp1uzh",
     *             "value": 50,
     *             "time": "2016-02-02T23:30:39.000Z",
     *             "name": null,
     *             "metadata": null,
     *             "type": "transfer"
     *         },
	 *
	 * @apiErrorExample {json} Address Not Found
	 * {
	 *     "ok": false,
	 *     "error": "address_not_found"
	 * }
	 *
	 * @apiErrorExample {json} Invalid Address
	 * {
	 *     "ok": false,
	 *     "error": "invalid_parameter",
	 *     "parameter": "address"
	 * }
	 */
  app.get("/addresses/:address/transactions", async function(req, res) {
    try {
      const transactions = await txController.getTransactionsByAddress(req.params.address, req.query.limit, req.query.offset, typeof req.query.excludeMined === "undefined");
      const out = [];

      transactions.rows.forEach(transaction => out.push(txController.transactionToJSON(transaction)));

      res.json({
        ok: true,
        count: out.length,
        total: transactions.count,
        transactions: out
      });
    } catch(error) {
      utils.sendErrorToRes(req, res, error);
    }
  });


  return app;
};
