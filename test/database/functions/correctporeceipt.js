(function () {
  "use strict";

  var DEBUG = false,
    _      = require("underscore"),
    assert = require('chai').assert,
    dblib  = require('../dblib'),
    datasource = dblib.datasource,
    adminCred = dblib.generateCreds();

  // TODO - write unit tests for the other version of correctPoReceipt

  describe("correctPoReceipt(integer, numeric, numeric, integer)", function () {
    this.timeout(10 * 1000);

    var params = {
      itemNumber: "BTRUCK1",
      whCode: "WH1",
      qty: 10
    };

    it("should get the itemsite_id and qoh",function (done) {
      var sql = "SELECT itemsite_qtyonhand, itemsite_id" +
                "  FROM itemsite" +
                " WHERE itemsite_id = getitemsiteid($1, $2);",
        options = _.extend({}, adminCred, { parameters: [ params.whCode, params.itemNumber ]});

      datasource.query(sql, options, function (err, res) {
        assert.isNull(err);
        assert.equal(res.rowCount, 1);
        assert.operator(res.rows[0].itemsite_id, ">", 0);
        params.itemsiteId = res.rows[0].itemsite_id;
        params.qohBefore = res.rows[0].itemsite_qtyonhand;
        done();
      });
    });

    // Create a Purchase Order
    it("should create a purchase order", function (done) {
     var callback = function (result) {
        if (DEBUG)
          console.log("createPurchaseOrder callback result: ", result);
        
        params.poheadId = result;
        done();
      };

      dblib.createPurchaseOrder(callback);
    });

    // Create a Purchase Order Line Item
    it("should create a purchase order line item", function (done) {
     var callback = function (result) {
        if (DEBUG)
          console.log("createPurchaseOrderLineItem callback result: ", result);
        
        params.poitemId = result;
        done();
      };

      dblib.createPurchaseOrderLineItem(params, callback);
    });

    it("should enter a receipt", function (done) {
      var sql = "SELECT enterPoReceipt($1, $2) AS result;",
        options = _.extend({}, adminCred, { parameters: [ params.poitemId, 1 ]});

      datasource.query(sql, options, function (err, res) {
        assert.isNull(err);
        assert.equal(res.rowCount, 1);
        assert.isNotNull(res.rows[0].result);
        params.recvId = res.rows[0].result;
        done();
      });
    });

    it("should post a receipt", function (done) {
      var sql = "SELECT postPoReceipts($1) AS result;",
        options = _.extend({}, adminCred, { parameters: [ params.poheadId ]});

      datasource.query(sql, options, function (err, res) {
        assert.isNull(err);
        assert.equal(res.rowCount, 1);
        assert.isNotNull(res.rows[0].result);
        params.itemlocSeries = res.rows[0].result;
        done();
      });
    });

    it.skip("should fail if recv record can't be found", function (done) {
      // TODO
    });

    it.skip("should fail with order type other than PO, RA, TO", function (done) {
      // TODO
    });

    it.skip("should fail if split receipt", function (done) {
      // TODO
    });

    it.skip("should fail no cost category for itemsite", function (done) {
      // TODO
    });

    // Note: Don't handle distribution detail here, that will be done in private-extensions/test/manufacturing

    it("correctreceipt() should succeed", function (done) {
      var sql = "SELECT correctPoReceipt($1::integer, $2::numeric, NULL::numeric, NULL::integer) AS result;",
        options = _.extend({}, adminCred, { parameters: [ params.recvId, params.qty ]});

      datasource.query(sql, options, function (err, res) {
        assert.isNull(err);
        assert.equal(res.rowCount, 1);
        assert.operator(res.rows[0].result, ">", 0);
        done();
      });
    });

    it("should have updated the poitem", function (done) {
      var sql = "SELECT poitem_qty_received AS result" +
                "  FROM poitem" +
                " WHERE poitem_id = $1;",
         cred = _.extend({}, adminCred, { parameters: [ params.poitemId ]});
      datasource.query(sql, cred, function (err, res) {
        assert.isNull(err);
        assert.equal(res.rowCount, 1);
        assert.equal(res.rows[0].result, params.qty, "qty received earlier");
        done();
      });
    });

    it("should have updated the recv", function (done) {
      var sql = "SELECT recv_posted AS result" +
                "  FROM recv" + 
                " WHERE recv_id = $1;",
         cred = _.extend({}, adminCred, { parameters: [ params.recvId ]});
      datasource.query(sql, cred, function (err, res) {
        assert.isNull(err);
        assert.equal(res.rowCount, 1);
        assert.isTrue(res.rows[0].result);
        done();
      });
    });

    it("should have updated qoh", function (done) {
      var sql = "SELECT itemsite_qtyonhand AS result" + 
                "  FROM itemsite" +
                " WHERE itemsite_id=$1::integer;",
        options = _.extend({}, adminCred, { parameters: [ params.itemsiteId ]});
        
      datasource.query(sql, options, function (err, res) {
        assert.isNull(err);
        assert.equal(res.rowCount, 1);
        assert.equal(res.rows[0].result, params.qohBefore + params.qty);
        done();
      });
    });

    it("there should be no unposted invhist records", function (done) {
      var sql = "SELECT true AS result" +
                "  FROM invhist" +
                " WHERE invhist_posted = false;";

      datasource.query(sql, adminCred, function (err, res) {
        assert.isNull(err);
        assert.equal(res.rowCount, 0);
        done();
      });
    });
  });
}());

