const router = require('express').Router();

const { Permissions } = require('../../../components/constants');
const { objectPermissionController } = require('../../../controllers');
const { objectPermissionValidator } = require('../../../validators');
const { checkAppMode, currentObject, hasPermission } = require('../../../middleware/authorization');
const { requireDb, requireSomeAuth } = require('../../../middleware/featureToggle');

router.use(checkAppMode);
router.use(requireDb);

/** Search for object permissions */
router.get('/', objectPermissionValidator.searchPermissions, (req, res, next) => {
  objectPermissionController.searchPermissions(req, res, next);
});

/** Returns the object permissions */
router.get('/:objectId', objectPermissionValidator.listPermissions, requireSomeAuth, currentObject, hasPermission(Permissions.MANAGE), (req, res, next) => {
  objectPermissionController.listPermissions(req, res, next);
});

/** Grants object permissions to users */
router.put('/:objectId', objectPermissionValidator.addPermissions, requireSomeAuth, currentObject, hasPermission(Permissions.MANAGE), (req, res, next) => {
  objectPermissionController.addPermissions(req, res, next);
});

/** Deletes object permissions for a user */
router.delete('/:objectId', objectPermissionValidator.removePermissions, requireSomeAuth, currentObject, hasPermission(Permissions.MANAGE), (req, res, next) => {
  objectPermissionController.removePermissions(req, res, next);
});

module.exports = router;
