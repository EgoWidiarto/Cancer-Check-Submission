const predictionController = require("./handler");

module.exports = [
  {
    method: "POST",
    path: "/predict",
    config: {
      payload: {
        maxBytes: 1000000,
        output: "stream",
        parse: true,
        multipart: true,
        failAction: (request, h, err) => {
          if (err.output.statusCode === 413) {
            return h
              .response({
                status: "fail",
                message: `Payload content length greater than maximum allowed: ${1000000}`,
              })
              .code(413)
              .takeover();
          }
        },
      },
    },
    handler: predictionController.getpredictCancer,
  },
  {
    method: "GET",
    path: "/predict/histories",
    handler: predictionController.getHistories,
  },
];
