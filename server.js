const https = require("https");
const express = require("express");
const app = express();
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));

const PaytmChecksum = require("./Paytm/Checksum");
const PaytmConfig = require("./Paytm/config");

var callbackUrl = "http://localhost:5000/payCallback";

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

app.get("/", (req, res) => {
  res.send("WORKING");
});

app.post("/paynow", (req, res) => {
  var orderId = "RSGI" + Math.floor(Math.random(6) * 1000000);
  var amount = "1.0";
  var userInfo = {
    custId: "CUST_001",
  };

  const paytmParams = {};

  paytmParams.body = {
    requestType: "Payment",
    mid: PaytmConfig.PaytmConfig.mid,
    websiteName: PaytmConfig.PaytmConfig.website,
    orderId: orderId,
    callbackUrl: callbackUrl,
    txnAmount: {
      value: amount,
      currency: "INR",
    },
    userInfo: userInfo,
  };

  PaytmChecksum.generateSignature(
    JSON.stringify(paytmParams.body),
    PaytmConfig.PaytmConfig.key
  ).then(function (checksum) {
    paytmParams.head = {
      signature: checksum,
    };

    var post_data = JSON.stringify(paytmParams);

    var options = {
      /* for Staging */
      hostname: "securegw-stage.paytm.in",

      /* for Production */
      // hostname: 'securegw.paytm.in',

      port: 443,
      path: `/theia/api/v1/initiateTransaction?mid=${PaytmConfig.PaytmConfig.mid}&orderId=${orderId}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": post_data.length,
      },
    };

    var response = "";
    var post_req = https.request(options, function (post_res) {
      post_res.on("data", function (chunk) {
        response += chunk;
      });

      post_res.on("end", function () {
        response = JSON.parse(response);
        console.log("txnToken:", response);

        res.writeHead(200, { "Content-Type": "text/html" });
        res.write(`<html>
                <head>
                    <title>Show Payment Page</title>
                </head>
                <body>
                    <center>
                        <h1>Please do not refresh this page...</h1>
                    </center>
                    <form method="post" action="https://securegw-stage.paytm.in/theia/api/v1/showPaymentPage?mid=${PaytmConfig.PaytmConfig.mid}&orderId=${orderId}" name="paytm">
                        <table border="1">
                            <tbody>
                                <input type="hidden" name="mid" value="${PaytmConfig.PaytmConfig.mid}">
                                <input type="hidden" name="orderId" value="${orderId}">
                                <input type="hidden" name="txnToken" value="${response.body.txnToken}">
                         </tbody>
                      </table>
                    <script type="text/javascript"> document.paytm.submit(); </script>
                   </form>
                </body>
             </html>`);
        res.end();
      });
    });

    post_req.write(post_data);
    post_req.end();
  });
});

app.post("/payCallback", (req, res) => {
  let callbackResponse = "";

  data = req.body;

  const paytmChecksum = data.CHECKSUMHASH;

  var isVerifySignature = PaytmChecksum.verifySignature(
    data,
    PaytmConfig.PaytmConfig.key,
    paytmChecksum
  );
  if (isVerifySignature) {
    console.log("Checksum Matched");

    var paytmParams = {};

    paytmParams.body = {
      mid: PaytmConfig.PaytmConfig.mid,
      orderId: data.ORDERID,
    };

    PaytmChecksum.generateSignature(
      JSON.stringify(paytmParams.body),
      PaytmConfig.PaytmConfig.key
    ).then(function (checksum) {
      paytmParams.head = {
        signature: checksum,
      };

      var post_data = JSON.stringify(paytmParams);

      var options = {
        /* for Staging */
        hostname: "securegw-stage.paytm.in",

        /* for Production */
        // hostname: 'securegw.paytm.in',

        port: 443,
        path: "/v3/order/status",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": post_data.length,
        },
      };

     
      var response = "";
      var post_req = https.request(options, function (post_res) {
        post_res.on("data", function (chunk) {
          response += chunk;
        });

        post_res.on("end", function () {
          console.log("Response: ", JSON.parse(response));
          res.contentType("application/json");
          res.send(response);
        });
      });

      // post the data
      post_req.write(post_data);
      post_req.end();
    });
  } else {
    console.log("Checksum Mismatched");
  }
});
