'use strict';

const router = require('express').Router();
const { asyncHandler } = require('../../middleware/errorHandler');
const { buildSitemap, buildRobots } = require('../../utils/sitemap');

router.get('/sitemap.xml', asyncHandler(async (req, res) => {
  const xml = await buildSitemap();
  res.type('application/xml').send(xml);
}));

router.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(buildRobots());
});

module.exports = router;
