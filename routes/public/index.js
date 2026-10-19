'use strict';

const router = require('express').Router();
const { asyncHandler } = require('../../middleware/errorHandler');

const content = require('../../controllers/public/contentController');
const vehicles = require('../../controllers/public/vehiclesController');
const catalog = require('../../controllers/public/catalogController');
const enquiries = require('../../controllers/public/enquiriesController');

// settings + editable page content
router.get('/settings', asyncHandler(content.getSettings));
router.get('/content/home', asyncHandler(content.getHome));
router.get('/content/:pageKey', asyncHandler(content.getPage));
router.get('/faqs', asyncHandler(content.getFaqs));

// vehicles + categories
router.get('/categories', asyncHandler(vehicles.listCategories));
router.get('/categories/:slug', asyncHandler(vehicles.categoryDetail));
router.get('/vehicles', asyncHandler(vehicles.list));
router.get('/vehicles/:slug', asyncHandler(vehicles.detail));

// services
router.get('/services', asyncHandler(catalog.listServices));
router.get('/services/:slug', asyncHandler(catalog.serviceDetail));

// cities
router.get('/cities', asyncHandler(catalog.listCities));
router.get('/cities/:slug', asyncHandler(catalog.cityDetail));

// gallery
router.get('/gallery/albums', asyncHandler(catalog.listAlbums));
router.get('/gallery', asyncHandler(catalog.listPhotos));

// testimonials + promotions
router.get('/testimonials', asyncHandler(catalog.listTestimonials));
router.get('/promotions/active', asyncHandler(catalog.activePromotions));

// enquiries + whatsapp
router.post('/enquiries', asyncHandler(enquiries.create));
router.post('/whatsapp-clicks', asyncHandler(enquiries.trackClick));
router.get('/whatsapp-message', asyncHandler(enquiries.previewMessage));

module.exports = router;
