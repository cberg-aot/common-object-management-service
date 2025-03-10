
const { validate, Joi } = require('express-validation');
const { scheme, type } = require('./common');
const { Permissions } = require('../components/constants');

const schema = {
  searchPermissions: {
    query: Joi.object({
      bucketId: scheme.guid,
      objectPerms: type.truthy,
      permCode: scheme.permCode,
      userId: Joi.alternatives()
        .conditional('objectPerms', {
          is: true,
          then: type.uuidv4
            .required()
            .messages({
              'string.guid': 'One userId required when `objectPerms=true`',
            }),
          otherwise: scheme.guid
        })
    })
  },

  listPermissions: {
    params: Joi.object({
      bucketId: scheme.guid
    }),
    query: Joi.object({
      userId: scheme.guid,
      permCode: scheme.permCode
    })
  },

  addPermissions: {
    params: Joi.object({
      bucketId: type.uuidv4
    }),
    body: Joi.array().items(
      Joi.object().keys({
        userId: type.uuidv4.required(),
        permCode: Joi.string().required().valid(...Object.values(Permissions)),
      }).required()
    ).required(),
  },

  removePermissions: {
    params: Joi.object({
      bucketId: type.uuidv4
    }),
    query: Joi.object({
      userId: scheme.guid,
      permCode: scheme.permCode,
    })
  }
};

const validator = {
  searchPermissions: validate(schema.searchPermissions, { statusCode: 422 }),
  listPermissions: validate(schema.listPermissions, { statusCode: 422 }),
  addPermissions: validate(schema.addPermissions, { statusCode: 422 }),
  removePermissions: validate(schema.removePermissions, { statusCode: 422 }),
};

module.exports = validator;
module.exports.schema = schema;
