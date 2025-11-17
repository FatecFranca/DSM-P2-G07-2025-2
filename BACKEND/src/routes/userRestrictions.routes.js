const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const userRestrictionsController = require('../controllers/userRestriction.controller');
const {
  addRestrictionSchema,
  updateRestrictionKeywordsSchema,
  validate
} = require('../validators/userRestriction.validator');

router.get('/', authenticate, userRestrictionsController.getUserRestrictions);
router.post(
  '/',
  authenticate,
  validate(addRestrictionSchema),
  userRestrictionsController.addRestriction
);
router.delete('/:id', authenticate, userRestrictionsController.removeRestriction);
router.put(
  '/:id',
  authenticate,
  validate(updateRestrictionKeywordsSchema),
  userRestrictionsController.updateRestrictionKeywords
);

module.exports = router;
