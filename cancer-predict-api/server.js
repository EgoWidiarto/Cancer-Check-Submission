require("dotenv").config();
const Hapi = require("@hapi/hapi");
const routes = require("./src/routes");

const init = async () => {
  const server = Hapi.server({
    port: 8080,
    host: "0.0.0.0",
    routes: {
      cors: {
        origin: ["*"],
      },
    },
  });

  server.ext("onPreResponse", (request, h) => {
    const response = request.response;
    if (response.isBoom) {
      const error = response;
      const statusCode = error.output.statusCode;
      const message = error.message || "An unexpected error occurred";
      return h
        .response({
          status: "error",
          message: message,
          statusCode: statusCode,
        })
        .code(statusCode);
    }
    return h.continue;
  });

  server.route(routes);

  await server.start();
  console.log(`Server running on ${server.info.uri}`);
};

process.on("unhandledRejection", (err) => {
  console.log(err);
  process.exit(1);
});

init();
