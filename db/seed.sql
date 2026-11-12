-- =====================================================================
--  Swiss Tour & Transfer - seed data
--  Run AFTER schema.sql.
--
--  This file mirrors Frontend/src/api/placeholders.js one for one: the same
--  settings, the same homepage and page copy, the same four vehicles, eight
--  services, ten cities, six albums, six reviews and two offers. The two
--  files are a pair - change one and change the other with it.
--
--  Safe to re-run on a database that already has data:
--      node scripts/db-setup.js --seed
--  Every content table is emptied first. Admin users, enquiries, WhatsApp
--  clicks and activity logs are never touched.
--
--  First admin user:
--      email:    info@technicmentors.com
--      password: 12345678
--  (bcrypt cost 10 - change the password after the first login)
-- =====================================================================

USE `swiss_tour_transfer`;

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- Clear the previous content
-- ---------------------------------------------------------------------
TRUNCATE TABLE `settings`;
TRUNCATE TABLE `homepage_sections`;
TRUNCATE TABLE `content_blocks`;
TRUNCATE TABLE `faqs`;
TRUNCATE TABLE `vehicle_categories`;
TRUNCATE TABLE `category_photos`;
TRUNCATE TABLE `vehicles`;
TRUNCATE TABLE `vehicle_photos`;
TRUNCATE TABLE `vehicle_specs`;
TRUNCATE TABLE `cities`;
TRUNCATE TABLE `vehicle_cities`;
TRUNCATE TABLE `services`;
TRUNCATE TABLE `service_photos`;
TRUNCATE TABLE `gallery_albums`;
TRUNCATE TABLE `gallery_photos`;
TRUNCATE TABLE `testimonials`;
TRUNCATE TABLE `promotions`;

-- ---------------------------------------------------------------------
-- Admin user - left as it is when the row already exists, so a re-seed
-- never resets a password that has been changed since.
-- ---------------------------------------------------------------------
INSERT INTO `admin_users` (`name`, `email`, `password_hash`, `role`) VALUES
('Site Administrator', 'info@technicmentors.com', '$2b$10$BJf/zW.e9HMARMbrPBlaUuka4Nl0C7aVeWHes2U15stmhYQMcMup.', 'admin')
ON DUPLICATE KEY UPDATE `email` = `email`;

-- ---------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------
INSERT INTO `settings` (`setting_key`, `setting_value`, `group_name`) VALUES
-- wa.me wants the country code with no + and no leading 00.
('whatsapp_number',            '41782276222', 'whatsapp'),
('whatsapp_template_vehicle',  'Hello, I would like to book the {vehicle}.\nPickup: \nDate: \nPassengers: ', 'whatsapp'),
('whatsapp_template_general',  'Hello, I would like to enquire about a chauffeur service.', 'whatsapp'),
('whatsapp_template_city',     'Hello, I would like a chauffeur in {city}.\nPickup: \nDate: ', 'whatsapp'),
('whatsapp_template_service',  'Hello, I would like to enquire about {service}.\nPickup: \nDate: ', 'whatsapp'),
('show_floating_whatsapp',     '1', 'whatsapp'),
('show_sticky_mobile_bar',     '1', 'whatsapp'),

('company_name',   'Swiss Tour & Transfer', 'contact'),
('tagline',        'Explore · Travel · Arrive', 'contact'),
-- Shown as written; tel: links strip the spaces.
('phone',          '+41 78 227 62 22', 'contact'),
('email',          'swisstourntransfers@gmail.com', 'contact'),
('notification_email', 'swisstourntransfers@gmail.com', 'contact'),
-- Kept on two lines, the way it is printed.
('address',        'Am Luchsgraben 16\n8051 Zurich, Switzerland', 'contact'),
('registration_number', 'CHE-240.981.004', 'contact'),
('opening_hours',  'Open 24/7', 'contact'),
('maps_embed_url', 'https://www.google.com/maps?q=Am%20Luchsgraben%2016%2C%208051%20Zurich%2C%20Switzerland&output=embed', 'contact'),
('maps_link',      'https://maps.google.com/?q=Am+Luchsgraben+16,+8051+Zurich,+Switzerland', 'contact'),

('social_instagram', 'https://instagram.com/', 'social'),
('social_facebook',  'https://facebook.com/', 'social'),
('social_linkedin',  'https://linkedin.com/', 'social'),
('social_tiktok',    'https://tiktok.com/', 'social'),

('announcement_enabled', '0', 'announcement'),
('announcement_text',    '', 'announcement'),
('announcement_link',    '/offers', 'announcement'),

('google_rating',        '4.9', 'trust'),
('google_review_count',  '127', 'trust'),
('reply_time_minutes',   '10', 'trust');

-- ---------------------------------------------------------------------
-- Homepage sections - the order the public site renders them in
--
-- Only sections the homepage actually draws are listed, so the order in the
-- admin panel is the order on screen and hiding a row visibly changes the
-- page. The quick-booking bar, the category grid, the seasonal banner and
-- the photo strip are switched off in the homepage code itself; they come
-- back here when they come back there.
-- ---------------------------------------------------------------------
INSERT INTO `homepage_sections` (`section_key`, `label`, `description`, `sort_order`, `is_visible`) VALUES
('hero',              'Hero slider',         'The slider, its buttons and the figures beside it',  1, 1),
('trust_strip',       'Trust strip',         '24/7, fixed prices, flight tracking, rating',        2, 1),
('featured_vehicles', 'Featured vehicles',   'Vehicles marked as featured',                        3, 1),
('services',          'Services',            'Services marked to show on the homepage',            4, 1),
('why_choose_us',     'Why choose us',       'Reasons to book with us',                            5, 1),
('how_it_works',      'How booking works',   'Three step booking explainer',                       6, 1),
('reviews',           'Customer reviews',    'Featured approved testimonials',                     7, 1),
('faq',               'FAQ',                 'Frequently asked questions',                         8, 1),
('final_cta',         'Final call to action','Closing WhatsApp and enquiry prompt',                9, 1);

-- ---------------------------------------------------------------------
-- Content blocks - homepage
-- ---------------------------------------------------------------------
INSERT INTO `content_blocks` (`page_key`, `block_key`, `block_value`, `block_type`) VALUES
-- The hero is a slider: it holds on each angle for `hero_slide_seconds` and
-- then slides to the next, wrapping round at the end. One slide per group,
-- written as "headline | accent | text | background image" - the accent is
-- the gold line printed under the headline.
('home', 'hero_eyebrow',   'Premium chauffeur service', 'text'),
('home', 'hero_slides',    'WEF Davos 2027,|planned to the minute.|Discreet, security-briefed chauffeurs for delegates, from the airport to every road into Davos.|/wef-davos-hero.png||Always on time,|every time.|Flight tracking and 24/7 dispatch, so you never wait.|/car-3.png||Made for those who|notice details.|Hand-picked vehicles, professional drivers, zero compromise.|/car-4.png||Every journey,|a first-class experience.|Discover Switzerland in comfort with private transfers and tailored chauffeur services.|/slider3.png', 'json'),
('home', 'hero_slide_seconds', '3', 'text'),
('home', 'hero_text',      'Airport transfers, business travel, events and city-to-city rides in Zurich, Geneva, Basel, St. Moritz and beyond - 24/7.', 'text'),
('home', 'hero_primary_label',   'Book your ride', 'text'),
('home', 'hero_secondary_label', 'View fleet', 'text'),
-- The figures beside them are counted from the fleet, the cities and the
-- rating, so only the labels are editable.
('home', 'hero_stat_labels', 'Vehicles in the fleet|Swiss cities served|Average guest rating', 'json'),

('home', 'trust_items', 'Available 24/7, 365 days|Fixed, all-inclusive prices|Free flight tracking and waiting|Multilingual professional chauffeurs|Rated {rating} by {count} guests', 'json'),

('home', 'vehicles_eyebrow', 'OUR FLEET', 'text'),
('home', 'vehicles_heading', 'A fleet kept immaculate', 'text'),

('home', 'services_eyebrow', 'SERVICES', 'text'),
('home', 'services_heading', 'Every journey, handled with Swiss precision', 'text'),
('home', 'services_text',    'Airport, business, events, weddings and alpine ski transfers across Switzerland.', 'text'),

('home', 'why_eyebrow', 'WHY CHOOSE US', 'text'),
('home', 'why_heading', 'Discretion, punctuality, comfort', 'text'),
('home', 'why_items',   'Fixed prices|The price we quote is the price you pay. No surge, no detour charges, no surprises.||Flight tracking|We monitor your arrival and adjust the pickup time for delays at no extra cost.||Professional chauffeurs|Vetted, discreet and multilingual - English, German, French and Italian.||Immaculate fleet|Late-model Mercedes cars, cleaned and checked before every single journey.||Always reachable|A real person answers on WhatsApp, day or night, 365 days a year.||Door to door|From your chalet to the terminal kerb, or the terminal kerb to your meeting.', 'json'),

('home', 'how_eyebrow', 'HOW BOOKING WORKS', 'text'),
('home', 'how_heading', 'Three steps, one message', 'text'),
('home', 'how_steps',   'Send your details|Tap the WhatsApp button and tell us where, when and how many of you there are.||Get a fixed price|We confirm the vehicle, the chauffeur and an all-inclusive price - usually within minutes.||Travel|Your chauffeur arrives early, tracks your flight and takes you door to door.', 'json'),

('home', 'reviews_eyebrow', 'CLIENT REVIEWS', 'text'),
('home', 'reviews_heading', 'What our guests say', 'text'),

('home', 'faq_eyebrow', 'QUESTIONS', 'text'),
('home', 'faq_heading', 'Frequently asked questions', 'text'),

('home', 'cta_heading', 'Ready when you are', 'text'),
('home', 'cta_text',    'Send one message and we will confirm your chauffeur, your vehicle and a fixed price.', 'text'),
('home', 'cta_primary_label',   'BOOK VIA WHATSAPP', 'text'),
('home', 'cta_secondary_label', 'SEND AN ENQUIRY', 'text'),
('home', 'cta_note',            'Typical reply time: about {minutes} minutes, 24 hours a day.', 'text'),

-- The small link on the right of each section heading.
('home', 'vehicles_link_label', 'View our fleet', 'text'),
('home', 'services_link_label', 'Learn more', 'text'),
('home', 'reviews_link_label',  'Read all reviews', 'text'),
('home', 'reviews_score_note',  'from {count} guest reviews', 'text');

-- ---------------------------------------------------------------------
-- Content blocks - about, footer, legal
-- ---------------------------------------------------------------------
INSERT INTO `content_blocks` (`page_key`, `block_key`, `block_value`, `block_type`) VALUES
('about', 'seo_title', 'About Us — A Swiss Chauffeur Company', 'text'),
('about', 'eyebrow',   'About us', 'text'),
('about', 'heading',   'About Swiss Tour & Transfer', 'text'),
('about', 'intro',     'A Swiss chauffeur company built on punctuality, discretion and vehicles kept to a standard our guests notice.', 'text'),
('about', 'body',      'Swiss Tour & Transfer provides private chauffeur and transfer services across Switzerland. We began with a single Mercedes and a simple promise: be early, be immaculate, and quote a price that does not change.\n\nToday we operate across Zurich, Geneva, Basel, Lucerne, Bern, Lausanne, Lugano, St. Moritz, Zermatt and Davos, serving business travellers, families, wedding parties and winter-sports guests. Our chauffeurs are vetted professionals who speak English, German, French and Italian, know the alpine passes in February, and understand that the best journey is one you do not have to think about.\n\nWhether it is a 05:00 run to ZRH, a week of meetings in Geneva, or a convoy for WEF Davos, the same standard applies.', 'html'),
('about', 'image',     '', 'image'),
('about', 'stat_items','15+|Years of combined chauffeur experience||10|Swiss cities served||24/7|Available every day of the year||4.9|Average guest rating', 'json'),
-- The blocks below are built from what the admin already maintains
-- elsewhere (the why/how lists, the services, the cities, the reviews and
-- the FAQ), so only their headings live here.
('about', 'values_eyebrow',   'What we stand for', 'text'),
('about', 'values_heading',   'The promises behind every journey', 'text'),
('about', 'steps_eyebrow',    'How we work', 'text'),
('about', 'steps_heading',    'Three steps, one message', 'text'),
('about', 'services_eyebrow', 'What we do', 'text'),
('about', 'services_heading', 'Every kind of journey', 'text'),
('about', 'cities_eyebrow',   'Where we drive', 'text'),
('about', 'cities_heading',   'Across Switzerland', 'text'),
('about', 'reviews_eyebrow',  'In our guests\' words', 'text'),
('about', 'reviews_heading',  'Recently, on the road', 'text'),
('about', 'reviews_link_label', 'Read all reviews', 'text'),
('about', 'faq_eyebrow',      'Questions', 'text'),
('about', 'faq_heading',      'Before you book', 'text'),
('about', 'cta_primary_label',   'Book via WhatsApp', 'text'),
('about', 'cta_secondary_label', 'View our vehicles', 'text'),

('footer', 'tagline',     'Explore · Travel · Arrive', 'text'),
('footer', 'description', 'Premium private chauffeur and transfer services across Switzerland. Airport transfers, business travel, events and alpine ski transfers - available 24/7.', 'text'),

('privacy',   'heading', 'Privacy policy', 'text'),
('privacy',   'body',    'This privacy policy explains how Swiss Tour & Transfer collects and uses personal data in line with the Swiss Federal Act on Data Protection (revDSG) and the GDPR.\n\n[Replace this text with your full privacy policy. Cover: what data you collect through the enquiry form and WhatsApp, why you collect it, how long you keep it, who you share it with, and how a guest can request deletion.]', 'html'),

('terms',     'heading', 'Terms and conditions', 'text'),
('terms',     'body',    '[Replace this text with your booking terms. Cover: how a booking is confirmed, what the quoted price includes, waiting time, cancellation windows and charges, luggage and child seats, liability, and payment methods.]', 'html'),

('impressum', 'heading', 'Impressum', 'text'),
('impressum', 'body',    'Swiss Tour & Transfer\nAm Luchsgraben 16\n8051 Zurich\nSwitzerland\n\nPhone: +41 78 227 62 22\nEmail: swisstourntransfers@gmail.com\n\n[Add your commercial register number (CHE-...), VAT number and the name of the person responsible for the content of this website.]', 'html'),

-- Shared by the three legal pages above, which otherwise carry only their
-- own heading and body.
('legal', 'eyebrow',         'Legal', 'text'),
('legal', 'seo_description', '{heading} for Swiss Tour & Transfer, a private chauffeur and transfer company in Switzerland.', 'text');

-- ---------------------------------------------------------------------
-- Content blocks - the listing pages
--
-- Every page carries the same five: the two lines search engines show, the
-- small label above the title, the title itself and the sentence under it.
-- Anything after those is particular to that page. {braces} are filled in
-- by the site from the settings or the figures on the page.
-- ---------------------------------------------------------------------
INSERT INTO `content_blocks` (`page_key`, `block_key`, `block_value`, `block_type`) VALUES
('vehicles', 'seo_title',       'Our Fleet — Chauffeur-Driven Mercedes, SUVs & Vans', 'text'),
('vehicles', 'seo_description', 'Browse our chauffeur-driven fleet in Switzerland: Mercedes S-Class and E-Class, V-Class vans, Range Rover SUVs, Sprinter minibuses and the Maybach. Book any vehicle via WhatsApp.', 'text'),
('vehicles', 'eyebrow',         'Our Fleet', 'text'),
('vehicles', 'heading',         'A fleet kept to Swiss standards', 'text'),
('vehicles', 'text',            'Every car is late model, immaculate and driven by a vetted professional chauffeur. Choose a vehicle and book it in one WhatsApp message.', 'text'),
('vehicles', 'all_label',       'All', 'text'),
('vehicles', 'empty_title',     'No fleet vehicles in this category', 'text'),
('vehicles', 'empty_text',      'Try another category, or message us on WhatsApp and we will find the right car.', 'text'),

('services', 'seo_title',       'Chauffeur Services in Switzerland — Airport, Business, Events & Ski', 'text'),
('services', 'seo_description', 'Airport transfers, hourly chauffeur hire, city-to-city travel, business travel, events, weddings and alpine ski transfers across Switzerland. Fixed prices, available 24/7.', 'text'),
('services', 'eyebrow',         'Services', 'text'),
('services', 'heading',         'Wherever you need to be', 'text'),
('services', 'text',            'From a 05:00 airport run to a week of meetings or a convoy for WEF Davos — the same chauffeurs, the same standard, a fixed price every time.', 'text'),
('services', 'card_link_label', 'Read more', 'text'),
('services', 'empty_title',     'No services published yet', 'text'),

('gallery', 'seo_title',       'Gallery — Our Vehicles, Chauffeurs and Swiss Routes', 'text'),
('gallery', 'seo_description', 'Photos of our chauffeur-driven vehicles, their interiors, airport pickups, weddings and alpine journeys across Switzerland.', 'text'),
('gallery', 'eyebrow',         'Gallery', 'text'),
('gallery', 'heading',         'The vehicles, the roads, the moments', 'text'),
('gallery', 'text',            'A look at the cars, the interiors and the places our chauffeurs take guests every week.', 'text'),
('gallery', 'all_label',       'All', 'text'),
('gallery', 'empty_title',     'No photos here yet', 'text'),
('gallery', 'empty_text',      'Check back soon.', 'text'),

('reviews', 'seo_title',          'Customer Reviews & Testimonials', 'text'),
('reviews', 'seo_description',    'Read what our guests say about our chauffeur service across Switzerland.', 'text'),
-- Used instead of the line above once there are reviews to count.
('reviews', 'seo_description_rated', 'Rated {average} out of 5 from {total} guest reviews. Read what our chauffeur clients say about airport transfers, business travel and ski journeys in Switzerland.', 'text'),
('reviews', 'eyebrow',            'Client reviews', 'text'),
('reviews', 'heading',            'What our guests say', 'text'),
('reviews', 'text',               'Every review below is from a real journey. We publish the mixed ones too.', 'text'),
('reviews', 'cta_text',           'Ready for your own journey?', 'text'),
('reviews', 'cta_label',          'Book Now', 'text'),
('reviews', 'empty_title',        'No reviews match this filter', 'text'),
('reviews', 'empty_text',         'Choose another rating, or read them all.', 'text'),

('offers', 'seo_title',       'Current Offers & Seasonal Deals', 'text'),
('offers', 'seo_description', 'Current offers on chauffeur services and airport transfers in Switzerland, including seasonal ski transfer deals and return journey discounts.', 'text'),
('offers', 'eyebrow',         'Offers', 'text'),
('offers', 'heading',         'Current offers', 'text'),
('offers', 'text',            'Seasonal deals and standing discounts. Expired offers come off this page automatically, so everything you see here is bookable today.', 'text'),
('offers', 'claim_label',     'Claim via WhatsApp', 'text'),
('offers', 'empty_title',     'No offers running right now', 'text'),
('offers', 'empty_text',      'Message us on WhatsApp for a fixed quote on any journey.', 'text'),

('contact', 'seo_title',       'Contact Us — Swiss Chauffeur Service', 'text'),
('contact', 'seo_description', 'Contact Swiss Tour & Transfer for private chauffeur and airport transfer bookings across Switzerland. WhatsApp, phone or email — we answer 24/7.', 'text'),
('contact', 'eyebrow',         'Contact', 'text'),
('contact', 'heading',         'Talk to a real person, any hour', 'text'),
('contact', 'text',            'WhatsApp is the fastest way to reach us and the way most guests book. Phone and email work just as well.', 'text'),
('contact', 'phone_label',     'Phone', 'text'),
('contact', 'email_label',     'Email', 'text'),
('contact', 'address_label',   'Address', 'text'),
('contact', 'hours_label',     'Opening hours', 'text'),
('contact', 'map_title',       'Our location on Google Maps', 'text'),
('contact', 'form_eyebrow',    'Book Online', 'text'),
('contact', 'form_heading',    'Send us your details', 'text'),

('book', 'seo_title',         'Book a Ride — Chauffeur & Airport Transfer Booking', 'text'),
('book', 'seo_description',   'Book a private chauffeur in Switzerland. Send one WhatsApp message or fill in the enquiry form and we confirm your vehicle, chauffeur and a fixed price.', 'text'),
('book', 'eyebrow',           'Book a ride', 'text'),
('book', 'heading',           'Two ways to book', 'text'),
('book', 'text',              'WhatsApp is the fastest. Prefer email? Fill in the form and we will confirm the price and chauffeur.', 'text'),
('book', 'whatsapp_badge',    'Fastest · Recommended', 'text'),
('book', 'whatsapp_heading',  'Book on WhatsApp in one message', 'text'),
('book', 'whatsapp_text',     'Tell us where, when and how many of you there are. Typical reply: a few minutes, 24 hours a day.', 'text'),
('book', 'whatsapp_label',    'Open WhatsApp', 'text'),
('book', 'form_badge',        'Book Online', 'text'),
('book', 'form_heading',      'Send your details by form', 'text'),
('book', 'form_text',         'Fill in the form below and we reply by email or phone within about {minutes} minutes. You can still send it to WhatsApp afterwards in one tap.', 'text'),
('book', 'form_anchor_label', 'Go to the form ↓', 'text'),
('book', 'form_eyebrow',      'Book Online', 'text'),
('book', 'form_section_heading', 'Tell us about your journey', 'text'),

('not_found', 'seo_title',       'Page not found', 'text'),
('not_found', 'seo_description', 'The page you are looking for does not exist.', 'text'),
('not_found', 'code',            '404', 'text'),
('not_found', 'heading',         'This road does not go anywhere', 'text'),
('not_found', 'text',            'The page you are looking for has moved or never existed. Let us get you back on route.', 'text'),
('not_found', 'home_label',      'Back to home', 'text'),
('not_found', 'fleet_label',     'View our vehicles', 'text'),
('not_found', 'whatsapp_label',  'Message us', 'text');

-- ---------------------------------------------------------------------
-- Content blocks - the pages built from one record
--
-- A vehicle, a service, a city and a category each have their own page, and
-- the wording around the record is the same on every one of them. {name},
-- {city} and {minutes} are filled in per page.
-- ---------------------------------------------------------------------
INSERT INTO `content_blocks` (`page_key`, `block_key`, `block_value`, `block_type`) VALUES
('vehicle_detail', 'seo_title',          '{name} with Chauffeur', 'text'),
('vehicle_detail', 'eyebrow',            'Our fleet', 'text'),
('vehicle_detail', 'about_eyebrow',      'About this car', 'text'),
('vehicle_detail', 'about_heading',      'Comfort, privacy and confidence.', 'text'),
('vehicle_detail', 'ideal_heading',      'Ideal for', 'text'),
('vehicle_detail', 'cities_heading',     'Available in', 'text'),
('vehicle_detail', 'book_eyebrow',       'Book this car', 'text'),
('vehicle_detail', 'passengers_label',   'Passengers', 'text'),
('vehicle_detail', 'suitcases_label',    'Suitcases', 'text'),
('vehicle_detail', 'hand_bags_label',    'Hand bags', 'text'),
('vehicle_detail', 'book_label',         'Book via WhatsApp', 'text'),
('vehicle_detail', 'call_label',         'Call us', 'text'),
('vehicle_detail', 'form_label',         'Book Online', 'text'),
('vehicle_detail', 'specs_heading',      'Specifications', 'text'),
('vehicle_detail', 'preview_label',      'Message preview', 'text'),
('vehicle_detail', 'similar_eyebrow',    'You may also like', 'text'),
('vehicle_detail', 'similar_heading',    'More from our fleet', 'text'),
('vehicle_detail', 'enquiry_eyebrow',    'Enquire', 'text'),
('vehicle_detail', 'enquiry_heading',    'Prefer a form?', 'text'),
('vehicle_detail', 'enquiry_text',       'WhatsApp is fastest, but you can send your details here instead. We reply within about {minutes} minutes.', 'text'),
('vehicle_detail', 'enquiry_points',     'A fixed, all-inclusive quote — no surge pricing|Written confirmation with your chauffeur\'s name|Free cancellation up to 24 hours before pickup', 'json'),
('vehicle_detail', 'enquiry_aside_label','Rather talk?', 'text'),
('vehicle_detail', 'enquiry_whatsapp_label', 'WhatsApp', 'text'),

('service_detail', 'eyebrow',       'Private chauffeur service', 'text'),
('service_detail', 'fleet_eyebrow', 'Fleet', 'text'),
('service_detail', 'fleet_heading', 'Cars we use for this service', 'text'),

('city_detail', 'eyebrow',          'City', 'text'),
('city_detail', 'heading',          'Chauffeur service in {city}', 'text'),
('city_detail', 'services_heading', 'Services in {city}', 'text'),
('city_detail', 'book_heading',     'Book in {city}', 'text'),
('city_detail', 'book_text',        'Tell us your pickup point and time. We confirm the vehicle, the chauffeur and a fixed price, usually within {minutes} minutes.', 'text'),
('city_detail', 'book_label',       'Book via WhatsApp', 'text'),
('city_detail', 'other_heading',    'Other cities', 'text'),
('city_detail', 'fleet_eyebrow',    'Available vehicles', 'text'),
('city_detail', 'fleet_heading',    'Our fleet in {city}', 'text'),
('city_detail', 'fleet_text',       'Every vehicle below can be booked for pickups in this city.', 'text'),

('category', 'eyebrow',     'Vehicle category', 'text'),
('category', 'empty_title', 'No vehicles in this category yet', 'text');

-- ---------------------------------------------------------------------
-- FAQs
-- ---------------------------------------------------------------------
INSERT INTO `faqs` (`id`, `question`, `answer`, `sort_order`, `is_visible`) VALUES
(1, 'How do I book?', 'Tap "Book via WhatsApp" on any vehicle and your message opens with the vehicle name already filled in. Tell us the pickup, destination, date and number of passengers, and we reply with a fixed price. You can also use the enquiry form if you prefer email.', 1, 1),
(2, 'Do you track flights?', 'Yes. We monitor your arrival and adjust the pickup time for delays at no extra cost. Your chauffeur waits with a name sign in the arrivals hall.', 2, 1),
(3, 'What is included in the price?', 'The quoted price is all-inclusive: vehicle, professional chauffeur, fuel, tolls, motorway vignette, parking at the airport, and 60 minutes of free waiting time on airport pickups.', 3, 1),
(4, 'Which payment methods do you accept?', 'We accept all major cards, TWINT, bank transfer, and invoicing for corporate accounts. Payment is taken after the journey unless agreed otherwise.', 4, 1),
(5, 'Can you provide child seats?', 'Yes, baby seats, child seats and booster seats are available free of charge. Tell us the ages of the children when you book so we bring the right ones.', 5, 1),
(6, 'What is your cancellation policy?', 'Cancellations made more than 24 hours before the pickup time are free of charge. Within 24 hours a fee may apply.', 6, 1);

-- ---------------------------------------------------------------------
-- Vehicle categories
--
-- Service classes rather than body styles, which is why the same model can
-- appear in more than one of them. `image` is the cover photo of the first
-- vehicle in the class, the same picture the category card shows.
-- ---------------------------------------------------------------------
INSERT INTO `vehicle_categories` (`id`, `name`, `slug`, `description`, `image`, `sort_order`, `is_visible`) VALUES
(1, 'Comfort',   'comfort',    'Comfortable, efficient cars for everyday transfers and city journeys.',         '/images/vehicles/toyota-prius.png',        1, 1),
(2, 'Business',  'business',   'Executive saloons and vans for meetings, airport runs and group travel.',      '/images/vehicles/mercedes-benz-eclass.png', 2, 1),
(3, 'Executive', 'first-class','Flagship saloons and the latest vans, for the journeys that matter most.',     '/images/vehicles/mercedes-benz-vclass.png', 3, 1),
(4, 'Premium',   'premium',    'Our top specification, including reclining VIP seating, for special occasions.','/images/vehicles/mercedes-benz-sclass.png', 4, 1);

-- ---------------------------------------------------------------------
-- Cities (SEO landing pages)
-- ---------------------------------------------------------------------
INSERT INTO `cities` (`id`, `name`, `slug`, `hub_label`, `intro`, `description`, `lat`, `lng`, `sort_order`, `is_visible`) VALUES
(1,  'Zurich',    'zurich',    'ZRH Airport · Hauptbahnhof',
 'Private chauffeur and airport transfer service in Zurich, available 24/7 with fixed prices and flight tracking.',
 'Zurich is where most of our journeys begin. We meet guests inside the arrivals hall at ZRH with a name sign, track every flight for delays, and drive door to door anywhere in the canton or across Switzerland.\n\nPopular routes from Zurich include ZRH to the city centre, Zurich to Davos for WEF, Zurich to St. Moritz and Zurich to Lucerne. Hourly chauffeur hire is available for meetings and roadshows.',
 47.3768860, 8.5417210, 1, 1),
(2,  'Geneva',    'geneva',    'GVA Airport · UN district',
 'Chauffeur service and airport transfers in Geneva for business travel, conferences and lake-side journeys.',
 'Geneva serves the UN district, the banking quarter and the whole of Lake Geneva. We handle GVA airport transfers, conference shuttles and city-to-city runs to Lausanne, Montreux and into France.\n\nOur chauffeurs are French and English speaking, and familiar with the protocol expected at diplomatic and corporate addresses.',
 46.2043910, 6.1431580, 2, 1),
(3,  'Basel',     'basel',     'EuroAirport BSL',
 'Private transfers and chauffeur hire in Basel, serving EuroAirport, Art Basel and the pharmaceutical campuses.',
 'Basel sits on three borders, and our chauffeurs cross them daily. We cover EuroAirport transfers, the pharmaceutical campuses, Art Basel, and city-to-city journeys into Germany and France.',
 47.5595990, 7.5885760, 3, 1),
(4,  'Lucerne',   'lucerne',   'Station · Lake piers',
 'Chauffeur service in Lucerne for lake excursions, Mount Pilatus trips and airport transfers.',
 'Lucerne is the gateway to central Switzerland. We collect guests from the station and the lake piers, and drive to Mount Pilatus, Engelberg, Rigi and on to Zurich or Interlaken.',
 47.0501680, 8.3093070, 4, 1),
(5,  'Bern',      'bern',      'Federal city',
 'Private chauffeur hire in Bern for government, business and onward alpine travel.',
 'As the federal city, Bern calls for discretion. We provide chauffeurs for government and corporate appointments, and transfers on to the Bernese Oberland, Interlaken and Gstaad.',
 46.9479920, 7.4474470, 5, 1),
(6,  'Lausanne',  'lausanne',  'Lake Geneva · Montreux',
 'Chauffeur and transfer service in Lausanne and Montreux on the shores of Lake Geneva.',
 'Lausanne and Montreux sit on the vineyard terraces of Lake Geneva. We serve the Olympic headquarters, the hotel schools, the Montreux Jazz Festival and transfers to GVA.',
 46.5196540, 6.6322730, 6, 1),
(7,  'Lugano',    'lugano',    'Ticino · Milan link',
 'Private transfers in Lugano and Ticino, including cross-border journeys to Milan and Como.',
 'Lugano is Switzerland in Italian. We cover Ticino, Lake Como and the run down to Milan Malpensa and Linate, with Italian-speaking chauffeurs.',
 46.0036770, 8.9511930, 7, 1),
(8,  'St. Moritz','st-moritz', 'Engadin · Samedan',
 'Luxury chauffeur service and winter transfers in St. Moritz and the Engadin valley.',
 'St. Moritz is our winter home. We run transfers from Zurich, Milan and Samedan airfield, and provide chauffeurs on call for the season - including the Snow Polo and White Turf weekends.\n\nAll winter vehicles carry snow tyres and chains as standard.',
 46.4908240, 9.8355480, 8, 1),
(9,  'Zermatt',   'zermatt',   'Via Tasch terminal',
 'Private transfers to Zermatt via the Tasch terminal, at the foot of the Matterhorn.',
 'Zermatt is car-free, so every journey ends at the Tasch terminal where the shuttle train runs to the village. We handle the drive from Zurich, Geneva or Sion, with luggage and ski equipment taken care of.',
 46.0207100, 7.7490800, 9, 1),
(10, 'Davos',     'davos',     'WEF · Ski',
 'Chauffeur service and WEF transfers in Davos and Klosters.',
 'Davos means two things: world-class skiing and the World Economic Forum. We coordinate multi-vehicle convoys for WEF week with security-aware chauffeurs, and run ski transfers all season.',
 46.8027050, 9.8360580, 10, 1);

-- ---------------------------------------------------------------------
-- Vehicles
-- ---------------------------------------------------------------------
INSERT INTO `vehicles`
(`id`, `category_id`, `name`, `slug`, `tagline`, `description`, `passengers`, `suitcases`, `hand_bags`, `price_from`, `price_unit`, `price_note`, `ideal_for`, `is_visible`, `is_featured`, `sort_order`) VALUES
(1, 1, 'Toyota Prius or Similar', 'toyota-prius',
 'Comfortable hybrid travel for airport transfers and everyday journeys.',
 'Travel comfortably in a Toyota Prius or similar, a practical hybrid choice for airport transfers, hotel pickups and city journeys. With space for up to three passengers, it suits solo travellers, couples and small parties.\n\nEnjoy a private door-to-door journey with a professional chauffeur, a welcoming meet and greet and a fixed quote agreed before you travel.',
 3, 3, 3, NULL, 'hour', 'Price on request',
 'Airport transfers\nCity journeys\nEveryday travel\nSolo and pair travel', 1, 1, 1),

(2, 2, 'Mercedes-Benz E-Class', 'mercedes-e-class',
 'The business saloon - comfortable, understated and sized for three with luggage.',
 'The E Class is the workhorse of Swiss business travel, and deliberately so. It is comfortable enough for a two-hour transfer, understated enough for any address, and carries three passengers with two suitcases.\n\nMost of our airport transfers and city-to-city journeys run in an E Class. It is the one to book when you want a professional chauffeur and an immaculate car with comfort and punctuality at every stage of your journey.',
 3, 2, 3, NULL, 'hour', 'Price on request',
 'Airport transfers\nDaily business travel\nCity-to-city journeys\nHourly hire', 1, 1, 2),

(3, 4, 'Mercedes-Benz S-Class', 'mercedes-s-class',
 'The benchmark for executive comfort - whisper-quiet, spacious and discreet.',
 'The S Class is the car our most demanding guests ask for by name. The rear cabin is quiet enough to take a call at motorway speed, the seats recline, and the ride smooths out everything the road does.\n\nIt is the right choice for airport runs where you need to work, for board-level guests, and for any journey where the car is part of the impression.',
 3, 2, 3, NULL, 'hour', 'Price on request',
 'Executive travel\nAirport transfers\nBoard meetings\nDiscreet VIP journeys', 1, 1, 3),

(4, 3, 'Mercedes-Benz V-Class', 'mercedes-v-class',
 'Seven seats, seven bags and a cabin you can hold a meeting in.',
 'The extra long V Class is the most versatile vehicle we run. Seven passengers travel in individual seats with room to spare, and the luggage bay takes a family holiday, a ski week or a film crew.\n\nIt is our most requested vehicle for ski transfers, family journeys and any airport run where the luggage matters as much as the people.',
 7, 7, 7, NULL, 'hour', 'Price on request',
 'Families and groups\nSki transfers\nAirport runs with luggage\nMobile meetings', 1, 1, 4);

-- ---------------------------------------------------------------------
-- Vehicle photos
--
-- The cover is what every card, category tile and detail page reads. These
-- paths point at the photos bundled in Frontend/public/images/vehicles, so
-- they work before anything has been uploaded through the admin panel.
-- ---------------------------------------------------------------------
INSERT INTO `vehicle_photos` (`vehicle_id`, `file_path`, `alt_text`, `sort_order`, `is_cover`) VALUES
(1, '/images/vehicles/toyota-prius.png',        'Toyota Prius or Similar with chauffeur', 1, 1),
(2, '/images/vehicles/mercedes-benz-eclass.png','Mercedes-Benz E-Class with chauffeur',   1, 1),
(3, '/images/vehicles/mercedes-benz-sclass.png','Mercedes-Benz S-Class with chauffeur',   1, 1),
(4, '/images/vehicles/mercedes-benz-vclass.png','Mercedes-Benz V-Class with chauffeur',   1, 1);

-- ---------------------------------------------------------------------
-- Vehicle specifications
--
-- Every vehicle opens with the same three promises, so whatever is listed
-- after them is what actually differs.
-- ---------------------------------------------------------------------
INSERT INTO `vehicle_specs` (`vehicle_id`, `spec_label`, `spec_value`, `sort_order`) VALUES
(1, 'Meet & Greet', 'Included', 1),
(1, 'Wifi on Board', 'Included', 2),
(1, 'Mineral Water', 'Included', 3),
(1, 'Class', 'Comfort hybrid', 4),
(1, 'Transmission', 'Automatic', 5),
(1, 'Winter equipment', 'Snow tyres November to April', 6),

(2, 'Meet & Greet', 'Included', 1),
(2, 'Wifi on Board', 'Included', 2),
(2, 'Mineral Water', 'Included', 3),
(2, 'Class', 'Business saloon', 4),
(2, 'Transmission', 'Automatic', 5),
(2, 'Rear seats', 'Heated leather', 6),
(2, 'Winter equipment', 'Snow tyres November to April', 7),

(3, 'Meet & Greet', 'Included', 1),
(3, 'Wifi on Board', 'Included', 2),
(3, 'Mineral Water', 'Included', 3),
(3, 'Class', 'First Class saloon', 4),
(3, 'Transmission', 'Automatic', 5),
(3, 'Rear seats', 'Heated, ventilated, massage', 6),
(3, 'Winter equipment', 'Snow tyres November to April', 7),

(4, 'Meet & Greet', 'Included', 1),
(4, 'Wifi on Board', 'Included', 2),
(4, 'Mineral Water', 'Included', 3),
(4, 'Class', 'Premium van', 4),
(4, 'Layout', 'Extra long wheelbase', 5),
(4, 'Seating', 'Seven individual seats', 6),
(4, 'Winter equipment', 'Snow tyres November to April', 7);

-- ---------------------------------------------------------------------
-- Vehicle to city availability - every vehicle, every city
-- ---------------------------------------------------------------------
INSERT INTO `vehicle_cities` (`vehicle_id`, `city_id`) VALUES
(1,1),(1,2),(1,3),(1,4),(1,5),(1,6),(1,7),(1,8),(1,9),(1,10),
(2,1),(2,2),(2,3),(2,4),(2,5),(2,6),(2,7),(2,8),(2,9),(2,10),
(3,1),(3,2),(3,3),(3,4),(3,5),(3,6),(3,7),(3,8),(3,9),(3,10),
(4,1),(4,2),(4,3),(4,4),(4,5),(4,6),(4,7),(4,8),(4,9),(4,10);

-- ---------------------------------------------------------------------
-- Services
--
-- `image` points at the photos bundled in Frontend/public, the same ones
-- the service cards and detail pages show.
-- ---------------------------------------------------------------------
INSERT INTO `services`
(`id`, `name`, `slug`, `short_description`, `full_description`, `included`, `image`, `price_text`, `sort_order`, `is_visible`, `show_on_homepage`) VALUES
(1, 'Airport Transfers', 'airport-transfers',
 'Meet-and-greet at ZRH, GVA and BSL with free flight tracking.',
 'Our most requested service. Your chauffeur tracks your flight, adjusts for delays at no extra cost, and waits in the arrivals hall with a name sign. Luggage is handled for you and the car is already warm in winter.\n\nWe cover Zurich (ZRH), Geneva (GVA), EuroAirport Basel (BSL), Bern, Lugano, Sion and Samedan, plus cross-border runs to Milan Malpensa and Munich. Departure transfers are timed to the check-in window for your airline and terminal.',
 'Meet-and-greet in the arrivals hall\nFree flight tracking and delay adjustment\n60 minutes free waiting time\nAll tolls, parking and vignette included\nLuggage assistance\nChild seats on request',
 '/airport-transfer.png', 'Fixed price per journey', 1, 1, 1),

(2, 'Hourly Chauffeur', 'hourly-chauffeur',
 'A car and chauffeur at your disposal, by the hour or by the day.',
 'When the day has several stops, or the schedule is likely to move, hourly hire is simpler than booking individual transfers. The car and chauffeur stay with you, luggage and coats stay in the vehicle, and you leave when you are ready rather than when the next booking says so.\n\nUsed most often for roadshows, property viewings, shopping days and conference schedules. Minimum booking is three hours.',
 'Dedicated car and chauffeur\nUnlimited stops within the hire\nWaiting time included\nAll fuel, tolls and parking\nItinerary changes on the day\nMinimum three hours',
 '/hourly-chauffeur.png', 'Hourly rate, minimum 3 hours', 2, 1, 1),

(3, 'Private Transfers', 'city-to-city',
 'Door-to-door across Switzerland and on to Milan, Munich and Lyon.',
 'A private alternative to the train for journeys where the luggage, the timing or the company makes the carriage impractical. Door to door, no changes, and you can work or sleep the whole way.\n\nCommon routes include Zurich to St. Moritz, Geneva to Zermatt, Zurich to Davos, Basel to Lucerne, and cross-border runs to Milan, Munich, Lyon and Stuttgart.',
 'Direct door-to-door journey\nFixed all-inclusive price\nAll tolls, vignettes and border formalities\nComfort stops on request\nWi-Fi on board\nSnow tyres and chains in winter',
 '/private-transfers.png', 'Fixed price per route', 3, 1, 1),

(4, 'Business Travel', 'business-travel',
 'Discreet, punctual transport for executives and roadshows.',
 'Corporate travel where reliability matters more than anything else. We hold standing arrangements for regular routes, handle multi-vehicle roadshows, and invoice monthly against a cost centre.\n\nChauffeurs assigned to corporate accounts are briefed on discretion, sign confidentiality agreements where required, and are used to working around a schedule that changes during the day.',
 'Account billing and monthly invoicing\nNamed chauffeurs for regular routes\nMulti-vehicle coordination\nConfidentiality agreements on request\nWi-Fi and charging at every seat\nPriority booking for account holders',
 '/business-travel.png', 'Corporate rates on account', 4, 1, 1),

(5, 'Events & WEF', 'events-and-wef',
 'Vehicle coordination for WEF Davos, Art Basel and galas.',
 'Event transport is a logistics problem before it is a driving one. We plan arrival windows, stage vehicles near the venue, and run a single point of contact who knows where every car is.\n\nWe have operated at WEF Davos, Art Basel, the Montreux Jazz Festival, Geneva Motor Show and private galas. For WEF specifically, our chauffeurs are briefed on the access zones and the security procedures, and convoys are planned around the week rather than the journey.',
 'Single coordinator for every vehicle\nVehicles staged near the venue\nWEF access and security briefing\nReal-time schedule changes\nBranded or unmarked vehicles\nOvernight and standby cover',
 '/events.png', 'Quoted per event', 5, 1, 1),

(6, 'Day Tours', 'day-tours',
 'Discover Switzerland with private tours and a professional chauffeur.',
 'Explore Switzerland at your own pace with a private chauffeur and a premium vehicle tailored to your journey. From scenic mountain routes and picturesque lakeside towns to charming villages and iconic landmarks, enjoy a comfortable and personalised travel experience.\n\nPlan your day around the places you want to see, with flexible stops for sightseeing, photography, shopping, and dining. Whether you are discovering a new city or enjoying a countryside escape, your chauffeur ensures a smooth, relaxed journey from start to finish.',
 'Private chauffeur and premium vehicle\nFlexible sightseeing stops\nScenic routes across Switzerland\nConvenient hotel pickup and drop-off\nTime for photographs and exploration\nCustomised itineraries on request',
 '/day-tours.png', 'Day Tours Pricing on request', 6, 1, 1),

(7, 'Ski Transfers', 'ski-transfers',
 'St. Moritz, Zermatt, Verbier, Gstaad, Davos and more.',
 'Alpine transfers from November to April, in vehicles equipped for the conditions rather than merely permitted in them. Snow tyres as standard, chains carried, and chauffeurs who drive these passes every week of the season.\n\nSki and board carriage is included, and we collect at the chalet door wherever the road allows. For Zermatt we drive to the Tasch terminal and see you onto the shuttle with your luggage.',
 'Snow tyres and chains as standard\nSki and snowboard carriage included\nChalet door collection\nExperienced alpine chauffeurs\nFlight tracking on arrival day\nHeated vehicle waiting for you',
 '/ski-tours.png', 'Fixed price per transfer', 7, 1, 1),

(8, '4 Country Tours', 'four-country-tours',
 'Switzerland, Germany, Austria and Liechtenstein in one private journey.',
 'Four countries, one chauffeur, no timetable. Our 4 Country Tour crosses Switzerland, Germany, Austria and Liechtenstein in a single private journey - the Swiss Alps and lakes, the Black Forest and Lake Constance in Germany, the Tyrolean mountains and old towns of Austria, and the castle and vineyards of Vaduz in Liechtenstein.\n\nThe borders are open and your chauffeur handles every one of them, along with the tolls, the vignettes and the routes. Travel as a day trip or over several days, stop wherever the view is worth it, and let the itinerary bend to you rather than the other way round.',
 'Private chauffeur and premium vehicle\nSwitzerland, Germany, Austria and Liechtenstein\nAll border crossings, tolls and vignettes handled\nCustomised multi-country itineraries\nScenic sightseeing stops\nHotel pickup and drop-off\nDay trips or multi-day journeys\nComfortable long-distance travel',
 '/four-country-tours.png', 'Quoted per journey', 8, 1, 1);

-- ---------------------------------------------------------------------
-- Gallery albums (these are the categories shown on the Gallery page)
-- ---------------------------------------------------------------------
INSERT INTO `gallery_albums` (`id`, `name`, `slug`, `sort_order`, `is_visible`) VALUES
(1, 'Vehicles',  'vehicles',  1, 1),
(2, 'Interiors', 'interiors', 2, 1),
(3, 'Airports',  'airports',  3, 1),
(4, 'Weddings',  'weddings',  4, 1),
(5, 'Events',    'events',    5, 1),
(6, 'Alpine',    'alpine',    6, 1);

-- ---------------------------------------------------------------------
-- Gallery photos
--
-- Captions only, with no file of their own: the public gallery picks a
-- bundled photo from the caption until a real one is uploaded in the admin
-- panel, which fills file_path in.
-- ---------------------------------------------------------------------
INSERT INTO `gallery_photos` (`album_id`, `file_path`, `caption`, `alt_text`, `sort_order`, `is_visible`) VALUES
(1, '', 'E-Class waiting at the kerb',       'E-Class waiting at the kerb',        1, 1),
(1, '', 'V-Class loaded for a ski week',     'V-Class loaded for a ski week',      2, 1),
(2, '', 'Rear cabin, ready for a call',      'Rear cabin, ready for a call',       3, 1),
(2, '', 'Executive seating in the Maybach',  'Executive seating in the Maybach',   4, 1),
(3, '', 'Arrivals hall pickup at ZRH',       'Arrivals hall pickup at ZRH',        5, 1),
(3, '', 'Departure drop-off at GVA',         'Departure drop-off at GVA',          6, 1),
(4, '', 'Decorated wedding car in Lucerne',  'Decorated wedding car in Lucerne',   7, 1),
(4, '', 'The couple arriving at the church', 'The couple arriving at the church',  8, 1),
(5, '', 'Convoy staged for WEF week',        'Convoy staged for WEF week',         9, 1),
(5, '', 'Event shuttle at Art Basel',        'Event shuttle at Art Basel',        10, 1),
(6, '', 'Winter pass road to St. Moritz',    'Winter pass road to St. Moritz',    11, 1),
(6, '', 'At the Tasch terminal for Zermatt', 'At the Tasch terminal for Zermatt', 12, 1);

-- ---------------------------------------------------------------------
-- Testimonials
-- ---------------------------------------------------------------------
INSERT INTO `testimonials`
(`id`, `customer_name`, `country`, `service_label`, `rating`, `review_text`, `source`, `is_approved`, `is_featured`, `sort_order`, `created_at`) VALUES
(1, 'James W.',   'United Kingdom', 'Airport transfer · Zurich',   5,
 'Flight landed over an hour late and the chauffeur was still there, waiting, with no fuss and no extra charge. The car was immaculate and I was at my hotel twenty minutes later. Exactly what you want after a long day.',
 'google', 1, 1, 1, '2026-01-14 09:20:00'),
(2, 'Claudia M.', 'Germany',        'Business travel · Geneva',    5,
 'We used Swiss Tour & Transfer for three days of meetings around Geneva. Same chauffeur every day, always early, and he rearranged the whole afternoon when a meeting overran. Faultless.',
 'google', 1, 1, 2, '2026-02-02 14:05:00'),
(3, 'Antoine R.', 'France',         'Private transfers · Basel',   5,
 'Booked on WhatsApp in about two minutes and had a fixed price straight back. The drive from Basel to Lucerne was comfortable and quiet, and the price was exactly what was quoted.',
 'google', 1, 1, 3, '2026-02-18 11:40:00'),
(4, 'Sofia L.',   'Italy',          'Wedding · Lucerne',           5,
 'The Maybach was beautiful and the chauffeur was so calm and kind on a very stressful morning. He had the car decorated exactly as we asked and got us to the church early. Thank you.',
 'google', 1, 1, 4, '2026-03-07 16:15:00'),
(5, 'Michael T.', 'United States',  'Ski transfer · St. Moritz',   5,
 'Zurich to St. Moritz in a snowstorm. The driver was completely unfazed, the car had proper winter tyres, and we arrived safely and on time. Worth every franc.',
 'direct', 1, 1, 5, '2026-03-21 08:30:00'),
(6, 'Priya S.',   'Switzerland',    'Events · WEF Davos',          5,
 'They coordinated four vehicles for our team during WEF week. One contact, everything on time, and the drivers knew the access routes better than we did.',
 'direct', 1, 0, 6, '2026-04-02 10:00:00');

-- ---------------------------------------------------------------------
-- Promotions
-- ---------------------------------------------------------------------
INSERT INTO `promotions`
(`id`, `title`, `description`, `code`, `placement`, `starts_at`, `ends_at`, `link_type`, `is_active`, `sort_order`) VALUES
(1, 'Winter ski transfer season',
 'Book any alpine transfer to St. Moritz, Zermatt, Verbier, Gstaad or Davos and travel in a vehicle equipped with snow tyres and chains as standard. Ski carriage included.',
 'SKI26', 'both', '2025-11-01', '2026-04-30', 'whatsapp', 1, 1),
(2, 'Return journey discount',
 'Book your outbound and return airport transfer at the same time and save on the round trip. Applies to all vehicle classes.',
 'RETURN10', 'both', '2026-01-01', '2026-12-31', 'whatsapp', 1, 2);
