'use strict';

const router = require('express').Router();
const { asyncHandler } = require('../../middleware/errorHandler');
const { requireAuth } = require('../../middleware/auth');
const upload = require('../../middleware/upload');

const auth = require('../../controllers/admin/authController');
const dashboard = require('../../controllers/admin/dashboardController');
const vehicles = require('../../controllers/admin/vehiclesController');
const catalog = require('../../controllers/admin/catalogController');
const content = require('../../controllers/admin/contentController');
const media = require('../../controllers/admin/mediaController');
const marketing = require('../../controllers/admin/marketingController');
const enquiries = require('../../controllers/admin/enquiriesController');
const settings = require('../../controllers/admin/settingsController');

/* ---------------------------------------------------------------- auth (open) */
router.post('/auth/login', asyncHandler(auth.login));

/* -------------------------------- everything below this line requires a token */
router.use(requireAuth);

router.get('/auth/me', asyncHandler(auth.me));
router.put('/auth/profile', asyncHandler(auth.updateProfile));
router.post('/auth/change-password', asyncHandler(auth.changePassword));

/* ------------------------------------------------------------------ dashboard */
router.get('/dashboard', asyncHandler(dashboard.overview));
router.get('/dashboard/export', asyncHandler(dashboard.exportEnquiries));
router.get('/dashboard/stats', asyncHandler(dashboard.stats));

/* ------------------------------------------------------------------- vehicles */
// Static paths first so "reorder" is never parsed as an :id.
router.put('/vehicles/reorder', asyncHandler(vehicles.reorder));
router.get('/vehicles', asyncHandler(vehicles.list));
router.post('/vehicles', asyncHandler(vehicles.create));
router.get('/vehicles/:id', asyncHandler(vehicles.detail));
router.put('/vehicles/:id', asyncHandler(vehicles.update));
router.delete('/vehicles/:id', asyncHandler(vehicles.remove));
router.patch('/vehicles/:id/visibility', asyncHandler(vehicles.setVisibility));
router.patch('/vehicles/:id/feature', asyncHandler(vehicles.setFeatured));
router.put('/vehicles/:id/specs', asyncHandler(vehicles.putSpecs));
router.put('/vehicles/:id/cities', asyncHandler(vehicles.putCities));
router.put('/vehicles/:id/photos/reorder', asyncHandler(vehicles.reorderPhotos));
router.post('/vehicles/:id/photos', upload.many, asyncHandler(vehicles.uploadPhotos));
router.patch('/vehicles/:id/photos/:photoId/cover', asyncHandler(vehicles.setCover));
router.delete('/vehicles/:id/photos/:photoId', asyncHandler(vehicles.deletePhoto));

/* ----------------------------------------------------------------- categories */
router.put('/categories/reorder', asyncHandler(catalog.reorderCategories));
router.get('/categories', asyncHandler(catalog.listCategories));
router.post('/categories', asyncHandler(catalog.createCategory));
router.put('/categories/:id', asyncHandler(catalog.updateCategory));
router.delete('/categories/:id', asyncHandler(catalog.removeCategory));
router.patch('/categories/:id/visibility', asyncHandler(catalog.toggleCategory));
router.get('/categories/:id', asyncHandler(catalog.categoryDetail));
router.put('/categories/:id/photos/reorder', asyncHandler(catalog.reorderCategoryPhotos));
router.post('/categories/:id/photos', upload.many, asyncHandler(catalog.uploadCategoryPhotos));
router.patch('/categories/:id/photos/:photoId/cover', asyncHandler(catalog.setCategoryCover));
router.delete('/categories/:id/photos/:photoId', asyncHandler(catalog.removeCategoryPhoto));

/* ------------------------------------------------------------------- services */
router.put('/services/reorder', asyncHandler(catalog.reorderServices));
router.get('/services', asyncHandler(catalog.listServices));
router.post('/services', asyncHandler(catalog.createService));
router.get('/services/:id', asyncHandler(catalog.serviceDetail));
router.put('/services/:id', asyncHandler(catalog.updateService));
router.delete('/services/:id', asyncHandler(catalog.removeService));
router.patch('/services/:id/visibility', asyncHandler(catalog.toggleService));
router.patch('/services/:id/homepage', asyncHandler(catalog.toggleServiceHome));
router.put('/services/:id/photos/reorder', asyncHandler(catalog.reorderServicePhotos));
router.post('/services/:id/photos', upload.many, asyncHandler(catalog.uploadServicePhotos));
router.patch('/services/:id/photos/:photoId/cover', asyncHandler(catalog.setServiceCover));
router.delete('/services/:id/photos/:photoId', asyncHandler(catalog.removeServicePhoto));

/* --------------------------------------------------------------------- cities */
router.put('/cities/reorder', asyncHandler(catalog.reorderCities));
router.get('/cities', asyncHandler(catalog.listCities));
router.post('/cities', asyncHandler(catalog.createCity));
router.put('/cities/:id', asyncHandler(catalog.updateCity));
router.delete('/cities/:id', asyncHandler(catalog.removeCity));
router.patch('/cities/:id/visibility', asyncHandler(catalog.toggleCity));

/* ----------------------------------------------- website content and sections */
router.get('/sections', asyncHandler(content.listSections));
router.put('/sections/reorder', asyncHandler(content.reorderSections));
router.patch('/sections/:key/visibility', asyncHandler(content.toggleSection));

router.put('/faqs/reorder', asyncHandler(content.reorderFaqs));
router.get('/faqs', asyncHandler(content.listFaqs));
router.post('/faqs', asyncHandler(content.createFaq));
router.put('/faqs/:id', asyncHandler(content.updateFaq));
router.delete('/faqs/:id', asyncHandler(content.removeFaq));

router.get('/content/:pageKey', asyncHandler(content.getPage));
router.put('/content/:pageKey', asyncHandler(content.updatePage));

/* -------------------------------------------------------------------- gallery */
router.put('/gallery/albums/reorder', asyncHandler(media.reorderAlbums));
router.get('/gallery/albums', asyncHandler(media.listAlbums));
router.post('/gallery/albums', asyncHandler(media.createAlbum));
router.put('/gallery/albums/:id', asyncHandler(media.updateAlbum));
router.delete('/gallery/albums/:id', asyncHandler(media.removeAlbum));

router.put('/gallery/photos/reorder', asyncHandler(media.reorderPhotos));
router.get('/gallery/photos', asyncHandler(media.listPhotos));
router.post('/gallery/photos', upload.many, asyncHandler(media.uploadPhotos));
router.put('/gallery/photos/:id', asyncHandler(media.updatePhoto));
router.delete('/gallery/photos/:id', asyncHandler(media.removePhoto));

/* --------------------------------------------------------------- testimonials */
router.put('/testimonials/reorder', asyncHandler(marketing.reorderTestimonials));
router.get('/testimonials', asyncHandler(marketing.listTestimonials));
router.post('/testimonials', asyncHandler(marketing.createTestimonial));
router.put('/testimonials/:id', asyncHandler(marketing.updateTestimonial));
router.delete('/testimonials/:id', asyncHandler(marketing.removeTestimonial));
router.patch('/testimonials/:id/approve', asyncHandler(marketing.approveTestimonial));
router.patch('/testimonials/:id/feature', asyncHandler(marketing.featureTestimonial));

/* ----------------------------------------------------------------- promotions */
router.put('/promotions/reorder', asyncHandler(marketing.reorderPromotions));
router.get('/promotions', asyncHandler(marketing.listPromotions));
router.post('/promotions', asyncHandler(marketing.createPromotion));
router.put('/promotions/:id', asyncHandler(marketing.updatePromotion));
router.delete('/promotions/:id', asyncHandler(marketing.removePromotion));
router.post('/promotions/:id/duplicate', asyncHandler(marketing.duplicatePromotion));
router.patch('/promotions/:id/active', asyncHandler(marketing.togglePromotion));

/* ------------------------------------------------------------------ enquiries */
/* ------------------------------------------------------------------ enquiries */
router.get('/enquiries', asyncHandler(enquiries.list));
router.get('/enquiries/:id', asyncHandler(enquiries.detail));
router.patch('/enquiries/:id/status', asyncHandler(enquiries.setStatus));
router.post('/enquiries/:id/whatsapp', asyncHandler(enquiries.logWhatsApp));
router.get('/enquiries/:id/activity', asyncHandler(enquiries.getActivity));
router.delete('/enquiries/:id', asyncHandler(enquiries.remove));

/* ------------------------------------------------------------------- settings */
router.get('/settings', asyncHandler(settings.get));
router.put('/settings', asyncHandler(settings.update));
router.post('/settings/test-email', asyncHandler(settings.testEmail));

/* -------------------------------------------------------------------- uploads */
router.post('/uploads', upload.single, asyncHandler(media.uploadSingle));

module.exports = router;
