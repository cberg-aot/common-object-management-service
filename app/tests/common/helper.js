const express = require('express');
const Problem = require('api-problem');
const { ValidationError } = require('express-validation');

/**
 * @class helper
 * Provides helper utilities that are commonly used in tests
 */
const helper = {
  /**
   * @function expressHelper
   * Creates a stripped-down simple Express server object
   * @param {string} basePath The path to mount the `router` on
   * @param {object} router An express router object to mount
   * @returns {object} A simple express server object with `router` mounted to `basePath`
   */
  expressHelper: (basePath, router) => {
    const app = express();

    app.use(express.json());
    app.use(express.urlencoded({
      extended: false
    }));
    app.use(basePath, router);

    // Handle 500
    // eslint-disable-next-line no-unused-vars
    app.use((err, _req, res, _next) => {
      if (err instanceof Problem) {
        err.send(res);
      } else if (err instanceof ValidationError) {
        return res.status(err.statusCode).json(err);
      } else {
        new Problem(500, {
          details: (err.message) ? err.message : err
        }).send(res);
      }
    });

    // Handle 404
    app.use((_req, res) => {
      new Problem(404).send(res);
    });

    return app;
  },

  /**
   * @function resetReturnThis
   * Updates all jest mocked attributes in `obj` to `mockReturnThis`
   * @param {object} obj An object with some mocked attributes
   */
  resetReturnThis: (obj) => {
    Object.keys(obj).forEach((f) => {
      if (jest.isMockFunction(obj[f])) obj[f].mockReturnThis();
    });
  }
};

module.exports = helper;
