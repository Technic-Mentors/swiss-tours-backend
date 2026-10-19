-- =====================================================================
--  Swiss Tour & Transfer - seed data
--  Run AFTER schema.sql.
--
--  First admin user:
--      email:    info@technicmentors.com
--      password: 12345678
--  (bcrypt cost 10 - change the password after the first login)
-- =====================================================================

USE `swiss_tour_transfer`;

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- Admin user
-- ---------------------------------------------------------------------
INSERT INTO `admin_users` (`name`, `email`, `password_hash`, `role`) VALUES
('Site Administrator', 'info@technicmentors.com', '$2b$10$BJf/zW.e9HMARMbrPBlaUuka4Nl0C7aVeWHes2U15stmhYQMcMup.', 'admin');

-- ---------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------
INSERT INTO `settings` (`setting_key`, `setting_value`, `group_name`) VALUES
('whatsapp_number',            '41000000000', 'whatsapp'),
('whatsapp_template_vehicle',  'Hello, I would like to book the {vehicle}.\nPickup: \nDate: \nPassengers: ', 'whatsapp'),
('whatsapp_template_general',  'Hello, I would like to enquire about a chauffeur service.', 'whatsapp'),
('whatsapp_template_city',     'Hello, I would like a chauffeur in {city}.\nPickup: \nDate: ', 'whatsapp'),
('whatsapp_template_service',  'Hello, I would like to enquire about {service}.\nPickup: \nDate: ', 'whatsapp'),
('show_floating_whatsapp',     '1', 'whatsapp'),
('show_sticky_mobile_bar',     '1', 'whatsapp'),

('company_name',   'Swiss Tour & Transfer', 'contact'),
('tagline',        'Explore · Travel · Arrive', 'contact'),
('phone',          '+41 00 000 00 00', 'contact'),
('email',          'info@swisstourtransfer.ch', 'contact'),
('notification_email', 'info@swisstourtransfer.ch', 'contact'),
('address',        'Bahnhofstrasse 1, 8001 Zurich, Switzerland', 'contact'),
('opening_hours',  'Open 24/7, 365 days a year', 'contact'),
('maps_embed_url', 'https://www.google.com/maps?q=Bahnhofstrasse%201,%208001%20Z%C3%BCrich&output=embed', 'contact'),
('maps_link',      'https://maps.google.com/?q=Bahnhofstrasse+1,+8001+Zurich', 'contact'),

('social_instagram', 'https://instagram.com/', 'social'),
('social_facebook',  'https://facebook.com/', 'social'),
('social_linkedin',  'https://linkedin.com/', 'social'),
('social_tiktok',    '', 'social'),

('announcement_enabled', '1', 'announcement'),
('announcement_text',    'Winter season ski transfers now bookable - St. Moritz, Zermatt, Verbier and Davos.', 'announcement'),
('announcement_link',    '/offers', 'announcement'),

('google_rating',        '4.9', 'trust'),
('google_review_count',  '127', 'trust'),
('reply_time_minutes',   '10', 'trust');

-- ---------------------------------------------------------------------
-- Homepage sections - exactly the agreed order
-- ---------------------------------------------------------------------
INSERT INTO `homepage_sections` (`section_key`, `label`, `description`, `sort_order`, `is_visible`) VALUES
('hero',              'Hero',                'Headline, intro text and main buttons',            1, 1),
('quick_booking',     'Quick booking bar',   'Pickup, destination, date and vehicle to WhatsApp', 2, 1),
('trust_strip',       'Trust strip',         '24/7, fixed prices, flight tracking, rating',       3, 1),
('categories',        'Vehicle categories',  'Grid of vehicle categories',                        4, 1),
('featured_vehicles', 'Featured vehicles',   'Vehicles marked as featured',                       5, 1),
('services',          'Services',            'Services marked to show on the homepage',           6, 1),
('why_choose_us',     'Why choose us',       'Reasons to book with us',                           7, 1),
('how_it_works',      'How booking works',   'Three step booking explainer',                      8, 1),
('seasonal_offer',    'Seasonal offer',      'Active promotion banner',                           9, 1),
('reviews',           'Customer reviews',    'Featured approved testimonials',                   10, 1),
('gallery',           'Gallery',             'Six photo preview linking to the gallery',         11, 1),
('faq',               'FAQ',                 'Frequently asked questions',                       12, 1),
('final_cta',         'Final call to action','Closing WhatsApp and enquiry prompt',              13, 1);

-- ---------------------------------------------------------------------
-- Content blocks - homepage
-- ---------------------------------------------------------------------
INSERT INTO `content_blocks` (`page_key`, `block_key`, `block_value`, `block_type`) VALUES
('home', 'hero_eyebrow',   'Chauffeur & limousine service · Switzerland', 'text'),
('home', 'hero_headline',  'Arrive in quiet luxury, anywhere in Switzerland.', 'text'),
('home', 'hero_text',      'Airport transfers, business travel, events and city-to-city rides in Zurich, Geneva, Basel, St. Moritz and beyond - 24/7.', 'text'),
('home', 'hero_image',     '', 'image'),
('home', 'hero_primary_label',   'BOOK VIA WHATSAPP', 'text'),
('home', 'hero_secondary_label', 'VIEW OUR VEHICLES', 'text'),

('home', 'trust_items', 'Available 24/7, 365 days|Fixed, all-inclusive prices|Free flight tracking and waiting|Multilingual professional chauffeurs|Rated {rating} by {count} guests', 'json'),

('home', 'categories_eyebrow', 'VEHICLE CATEGORIES', 'text'),
('home', 'categories_heading', 'The right car for every journey', 'text'),
('home', 'categories_text',    'From a discreet business saloon to a six-seat van for the whole family and their skis.', 'text'),

('home', 'vehicles_eyebrow', 'OUR VEHICLES', 'text'),
('home', 'vehicles_heading', 'Premium vehicles, immaculately kept', 'text'),
('home', 'vehicles_text',    'Every car is late model, immaculate and driven by a vetted professional chauffeur.', 'text'),

('home', 'services_eyebrow', 'SERVICES', 'text'),
('home', 'services_heading', 'Every journey, handled with Swiss precision', 'text'),
('home', 'services_text',    'Airport, business, events, weddings and alpine ski transfers across Switzerland.', 'text'),

('home', 'why_eyebrow', 'WHY CHOOSE US', 'text'),
('home', 'why_heading', 'Discretion, punctuality, comfort', 'text'),
('home', 'why_items',   'Fixed prices|The price we quote is the price you pay. No surge, no detour charges, no surprises.||Flight tracking|We monitor your arrival and adjust the pickup time for delays at no extra cost.||Professional chauffeurs|Vetted, discreet and multilingual - English, German, French and Italian.||Immaculate vehicles|Late-model Mercedes vehicles, cleaned and checked before every single journey.||Always reachable|A real person answers on WhatsApp, day or night, 365 days a year.||Door to door|From your chalet to the terminal kerb, or the terminal kerb to your meeting.', 'json'),

('home', 'how_eyebrow', 'HOW BOOKING WORKS', 'text'),
('home', 'how_heading', 'Three steps, one message', 'text'),
('home', 'how_steps',   'Send your details|Tap the WhatsApp button and tell us where, when and how many of you there are.||Get a fixed price|We confirm the vehicle, the chauffeur and an all-inclusive price - usually within minutes.||Travel|Your chauffeur arrives early, tracks your flight and takes you door to door.', 'json'),

('home', 'reviews_eyebrow', 'CLIENT REVIEWS', 'text'),
('home', 'reviews_heading', 'What our guests say', 'text'),

('home', 'gallery_eyebrow', 'GALLERY', 'text'),
('home', 'gallery_heading', 'The vehicles, the roads, the moments', 'text'),

('home', 'faq_eyebrow', 'QUESTIONS', 'text'),
('home', 'faq_heading', 'Frequently asked questions', 'text'),

('home', 'cta_heading', 'Ready when you are', 'text'),
('home', 'cta_text',    'Send one message and we will confirm your chauffeur, your vehicle and a fixed price.', 'text'),
('home', 'cta_primary_label',   'BOOK VIA WHATSAPP', 'text'),
('home', 'cta_secondary_label', 'SEND AN ENQUIRY', 'text'),

('home', 'quick_booking_heading', 'Get a price in one message', 'text');

-- ---------------------------------------------------------------------
-- Content blocks - about, footer, legal
-- ---------------------------------------------------------------------
INSERT INTO `content_blocks` (`page_key`, `block_key`, `block_value`, `block_type`) VALUES
('about', 'heading',   'About Swiss Tour & Transfer', 'text'),
('about', 'intro',     'A Swiss chauffeur company built on punctuality, discretion and vehicles kept to a standard our guests notice.', 'text'),
('about', 'body',      'Swiss Tour & Transfer provides private chauffeur and transfer services across Switzerland. We began with a single Mercedes and a simple promise: be early, be immaculate, and quote a price that does not change.\n\nToday we operate across Zurich, Geneva, Basel, Lucerne, Bern, Lausanne, Lugano, St. Moritz, Zermatt and Davos, serving business travellers, families, wedding parties and winter-sports guests. Our chauffeurs are vetted professionals who speak English, German, French and Italian, know the alpine passes in February, and understand that the best journey is one you do not have to think about.\n\nWhether it is a 05:00 run to ZRH, a week of meetings in Geneva, or a convoy for WEF Davos, the same standard applies.', 'html'),
('about', 'image',     '', 'image'),
('about', 'stat_items','15+|Years of combined chauffeur experience||10|Swiss cities served||24/7|Available every day of the year||4.9|Average guest rating', 'json'),

('footer', 'tagline',     'Explore · Travel · Arrive', 'text'),
('footer', 'description', 'Premium private chauffeur and transfer services across Switzerland. Airport transfers, business travel, events and alpine ski transfers - available 24/7.', 'text'),

('privacy',   'heading', 'Privacy policy', 'text'),
('privacy',   'body',    'This privacy policy explains how Swiss Tour & Transfer collects and uses personal data in line with the Swiss Federal Act on Data Protection (revDSG) and the GDPR.\n\n[Replace this text with your full privacy policy. Cover: what data you collect through the enquiry form and WhatsApp, why you collect it, how long you keep it, who you share it with, and how a guest can request deletion.]', 'html'),

('terms',     'heading', 'Terms and conditions', 'text'),
('terms',     'body',    '[Replace this text with your booking terms. Cover: how a booking is confirmed, what the quoted price includes, waiting time, cancellation windows and charges, luggage and child seats, liability, and payment methods.]', 'html'),

('impressum', 'heading', 'Impressum', 'text'),
('impressum', 'body',    'Swiss Tour & Transfer\nBahnhofstrasse 1\n8001 Zurich\nSwitzerland\n\nPhone: +41 00 000 00 00\nEmail: info@swisstourtransfer.ch\n\n[Add your commercial register number (CHE-...), VAT number and the name of the person responsible for the content of this website.]', 'html');

-- ---------------------------------------------------------------------
-- FAQs
-- ---------------------------------------------------------------------
INSERT INTO `faqs` (`question`, `answer`, `sort_order`, `is_visible`) VALUES
('How do I book?', 'Tap "Book via WhatsApp" on any vehicle and your message opens with the vehicle name already filled in. Tell us the pickup, destination, date and number of passengers, and we reply with a fixed price. You can also use the enquiry form if you prefer email.', 1, 1),
('Do you track flights?', 'Yes. We monitor your arrival and adjust the pickup time for delays at no extra cost. Your chauffeur waits with a name sign in the arrivals hall.', 2, 1),
('What is included in the price?', 'The quoted price is all-inclusive: vehicle, professional chauffeur, fuel, tolls, motorway vignette, parking at the airport, and 60 minutes of free waiting time on airport pickups.', 3, 1),
('Which payment methods do you accept?', 'We accept all major cards, TWINT, bank transfer, and invoicing for corporate accounts. Payment is taken after the journey unless agreed otherwise.', 4, 1),
('Can you provide child seats?', 'Yes, baby seats, child seats and booster seats are available free of charge. Tell us the ages of the children when you book so we bring the right ones.', 5, 1),
('What is your cancellation policy?', 'Cancellations made more than 24 hours before the pickup time are free of charge. Within 24 hours a fee may apply. [Adjust these terms in the admin panel to match your policy.]', 6, 1);

-- ---------------------------------------------------------------------
-- Vehicle categories
-- ---------------------------------------------------------------------
INSERT INTO `vehicle_categories` (`id`, `name`, `slug`, `description`, `sort_order`, `is_visible`) VALUES
(1, 'Business',   'business',   'Discreet executive saloons for meetings, airport runs and everyday travel.', 1, 1),
(2, 'First Class','first-class','Flagship saloons with rear-seat comfort for the most important journeys.',  2, 1),
(3, 'Luxury Van', 'luxury-van', 'Six to seven seats with room for luggage, skis and the whole family.',      3, 1),
(4, 'SUV',        'suv',        'All-wheel drive comfort for alpine roads and winter conditions.',           4, 1),
(5, 'Minibus',    'minibus',    'Up to sixteen seats for groups, events and corporate shuttles.',            5, 1),
(6, 'Prestige',   'prestige',   'Statement cars for weddings, galas and special occasions.',                 6, 1);

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
(1, 2, 'Mercedes-Benz S-Class', 'mercedes-s-class',
 'The benchmark for executive comfort - whisper-quiet, spacious and discreet.',
 'The S-Class is the car our most demanding guests ask for by name. The rear cabin is quiet enough to take a call at motorway speed, the seats recline and massage, and the ride smooths out everything the road does.\n\nBehind the wheel is a chauffeur who has driven this car for years: no sudden inputs, no conversation unless you start one, and an arrival time that is always a few minutes early. It is the right choice for airport runs where you need to work, for board-level guests, and for any journey where the car is part of the impression.',
 3, 2, 2, NULL, 'hour', 'Price on request', 'Executive travel\nAirport transfers\nBoard meetings\nDiscreet VIP journeys', 1, 1, 1),

(2, 1, 'Mercedes-Benz E-Class', 'mercedes-e-class',
 'The everyday business saloon - comfortable, efficient and never ostentatious.',
 'The E-Class is the workhorse of Swiss business travel, and deliberately so. It is comfortable enough for a two-hour transfer, understated enough for any address, and sized right for one or two passengers with luggage.\n\nMost of our airport transfers and city-to-city journeys run in an E-Class. If you want a professional chauffeur and a quiet, immaculate car without paying for a flagship, this is the one to book.',
 3, 2, 2, NULL, 'hour', 'Price on request', 'Airport transfers\nDaily business travel\nCity-to-city journeys\nHourly hire', 1, 1, 2),

(3, 3, 'Mercedes-Benz V-Class', 'mercedes-v-class',
 'Seven seats, full-height luggage space and a cabin you can hold a meeting in.',
 'The V-Class is the most versatile vehicle we run. Seven passengers travel in individual seats with room to spare, and the luggage bay swallows a family holiday, a ski week or a film crew.\n\nConfigured with the rear seats facing each other it becomes a mobile meeting room; configured conventionally it is the most comfortable way to move a group from ZRH to the mountains. It is our most requested vehicle for ski transfers and family journeys.',
 7, 7, 7, NULL, 'hour', 'Price on request', 'Families and groups\nSki transfers\nAirport runs with luggage\nMobile meetings', 1, 1, 3),

(4, 4, 'Range Rover', 'range-rover',
 'All-wheel drive composure for alpine passes and deep winter.',
 'When the forecast turns and the pass road is white, the Range Rover is the car we send. Permanent all-wheel drive, winter tyres as standard and enough ground clearance to make an unploughed chalet driveway a non-event.\n\nInside it is as quiet and well-finished as any luxury saloon, with a commanding view that makes alpine roads genuinely enjoyable. The usual choice for St. Moritz, Zermatt, Verbier and Gstaad between November and April.',
 4, 4, 3, NULL, 'hour', 'Price on request', 'Alpine and winter transfers\nSki resorts\nMountain chalets\nAll-weather travel', 1, 1, 4),

(5, 5, 'Mercedes-Benz Sprinter', 'mercedes-sprinter',
 'Up to sixteen seats for groups, events and corporate shuttles.',
 'For a wedding party, a conference shuttle or a corporate away-day, the Sprinter moves everyone together in one vehicle. Up to sixteen seats with a separate luggage compartment, air conditioning throughout and a chauffeur used to coordinating group timings.\n\nWe run Sprinters as event shuttles on fixed loops and as single point-to-point transfers. For larger movements we can put several on the same schedule.',
 16, 16, 16, NULL, 'journey', 'Price on request', 'Groups and events\nConference shuttles\nWedding parties\nCorporate away-days', 1, 0, 5),

(6, 6, 'Mercedes-Maybach S-Class', 'mercedes-maybach-s-class',
 'The occasion car - extended wheelbase, reclining rear seats, complete presence.',
 'The Maybach is what you book when the journey itself is part of the event. The extended wheelbase gives the rear passengers first-class legroom, the seats recline almost flat, and the cabin is isolated from the outside world in a way that has to be experienced.\n\nIt is our wedding car, our gala car, and the one chosen for guests who should arrive to be noticed. Ribbons and a second vehicle for the party can be arranged.',
 3, 2, 2, NULL, 'hour', 'Price on request', 'Weddings|Galas and premieres|VIP arrivals|Special occasions', 1, 1, 6);

-- ---------------------------------------------------------------------
-- Vehicle specifications
-- ---------------------------------------------------------------------
INSERT INTO `vehicle_specs` (`vehicle_id`, `spec_label`, `spec_value`, `sort_order`) VALUES
(1, 'Class', 'First Class saloon', 1),
(1, 'Transmission', 'Automatic', 2),
(1, 'Climate', '4-zone climate control', 3),
(1, 'Rear seats', 'Heated, ventilated, massage', 4),
(1, 'Connectivity', 'Wi-Fi, USB-C, wireless charging', 5),
(1, 'Refreshments', 'Still and sparkling water', 6),
(1, 'Winter equipment', 'Snow tyres November to April', 7),

(2, 'Class', 'Business saloon', 1),
(2, 'Transmission', 'Automatic', 2),
(2, 'Climate', '2-zone climate control', 3),
(2, 'Rear seats', 'Heated leather', 4),
(2, 'Connectivity', 'Wi-Fi, USB-C', 5),
(2, 'Refreshments', 'Still water', 6),
(2, 'Winter equipment', 'Snow tyres November to April', 7),

(3, 'Class', 'Luxury van', 1),
(3, 'Transmission', 'Automatic', 2),
(3, 'Seating', '7 individual seats, optional conference layout', 3),
(3, 'Climate', '3-zone climate control', 4),
(3, 'Connectivity', 'Wi-Fi, USB-C at every seat', 5),
(3, 'Luggage', 'Full-height rear bay, ski carrier available', 6),
(3, 'Winter equipment', 'Snow tyres and chains', 7),

(4, 'Class', 'Luxury SUV', 1),
(4, 'Drivetrain', 'Permanent all-wheel drive', 2),
(4, 'Transmission', 'Automatic', 3),
(4, 'Climate', '4-zone climate control', 4),
(4, 'Connectivity', 'Wi-Fi, USB-C, wireless charging', 5),
(4, 'Winter equipment', 'Snow tyres, chains, ski carrier', 6),

(5, 'Class', 'Minibus', 1),
(5, 'Transmission', 'Automatic', 2),
(5, 'Seating', 'Up to 16 passengers', 3),
(5, 'Climate', 'Full cabin air conditioning', 4),
(5, 'Luggage', 'Separate luggage compartment', 5),
(5, 'Access', 'Electric side step', 6),

(6, 'Class', 'Prestige saloon', 1),
(6, 'Wheelbase', 'Extended', 2),
(6, 'Transmission', 'Automatic', 3),
(6, 'Rear seats', 'Executive reclining, heated, massage', 4),
(6, 'Climate', '4-zone climate with fragrance', 5),
(6, 'Connectivity', 'Wi-Fi, rear screens, wireless charging', 6),
(6, 'Occasions', 'Ribbons and decoration on request', 7);

-- ---------------------------------------------------------------------
-- Vehicle to city availability
-- ---------------------------------------------------------------------
INSERT INTO `vehicle_cities` (`vehicle_id`, `city_id`) VALUES
(1,1),(1,2),(1,3),(1,4),(1,5),(1,6),(1,8),(1,10),
(2,1),(2,2),(2,3),(2,4),(2,5),(2,6),(2,7),(2,8),(2,9),(2,10),
(3,1),(3,2),(3,3),(3,4),(3,5),(3,6),(3,7),(3,8),(3,9),(3,10),
(4,1),(4,2),(4,4),(4,8),(4,9),(4,10),
(5,1),(5,2),(5,3),(5,4),(5,6),(5,10),
(6,1),(6,2),(6,4),(6,6),(6,8);

-- ---------------------------------------------------------------------
-- Services
-- ---------------------------------------------------------------------
INSERT INTO `services`
(`name`, `slug`, `short_description`, `full_description`, `included`, `price_text`, `sort_order`, `is_visible`, `show_on_homepage`) VALUES
('Airport Transfers', 'airport-transfers',
 'Meet-and-greet at ZRH, GVA and BSL with free flight tracking.',
 'Our most requested service. Your chauffeur tracks your flight, adjusts for delays at no extra cost, and waits in the arrivals hall with a name sign. Luggage is handled for you and the car is already warm in winter.\n\nWe cover Zurich (ZRH), Geneva (GVA), EuroAirport Basel (BSL), Bern, Lugano, Sion and Samedan, plus cross-border runs to Milan Malpensa and Munich. Departure transfers are timed to the check-in window for your airline and terminal.',
 'Meet-and-greet in the arrivals hall\nFree flight tracking and delay adjustment\n60 minutes free waiting time\nAll tolls, parking and vignette included\nLuggage assistance\nChild seats on request',
 'Fixed price per journey', 1, 1, 1),

('Hourly Chauffeur', 'hourly-chauffeur',
 'A car and chauffeur at your disposal, by the hour or by the day.',
 'When the day has several stops, or the schedule is likely to move, hourly hire is simpler than booking individual transfers. The car and chauffeur stay with you, luggage and coats stay in the vehicle, and you leave when you are ready rather than when the next booking says so.\n\nUsed most often for roadshows, property viewings, shopping days and conference schedules. Minimum booking is three hours.',
 'Dedicated car and chauffeur\nUnlimited stops within the hire\nWaiting time included\nAll fuel, tolls and parking\nItinerary changes on the day\nMinimum three hours',
 'Hourly rate, minimum 3 hours', 2, 1, 1),

('City-to-City', 'city-to-city',
 'Door-to-door across Switzerland and on to Milan, Munich and Lyon.',
 'A private alternative to the train for journeys where the luggage, the timing or the company makes the carriage impractical. Door to door, no changes, and you can work or sleep the whole way.\n\nCommon routes include Zurich to St. Moritz, Geneva to Zermatt, Zurich to Davos, Basel to Lucerne, and cross-border runs to Milan, Munich, Lyon and Stuttgart.',
 'Direct door-to-door journey\nFixed all-inclusive price\nAll tolls, vignettes and border formalities\nComfort stops on request\nWi-Fi on board\nSnow tyres and chains in winter',
 'Fixed price per route', 3, 1, 1),

('Business Travel', 'business-travel',
 'Discreet, punctual transport for executives and roadshows.',
 'Corporate travel where reliability matters more than anything else. We hold standing arrangements for regular routes, handle multi-vehicle roadshows, and invoice monthly against a cost centre.\n\nChauffeurs assigned to corporate accounts are briefed on discretion, sign confidentiality agreements where required, and are used to working around a schedule that changes during the day.',
 'Account billing and monthly invoicing\nNamed chauffeurs for regular routes\nMulti-vehicle coordination\nConfidentiality agreements on request\nWi-Fi and charging at every seat\nPriority booking for account holders',
 'Corporate rates on account', 4, 1, 1),

('Events & WEF', 'events-and-wef',
 'Vehicle coordination for WEF Davos, Art Basel and galas.',
 'Event transport is a logistics problem before it is a driving one. We plan arrival windows, stage vehicles near the venue, and run a single point of contact who knows where every car is.\n\nWe have operated at WEF Davos, Art Basel, the Montreux Jazz Festival, Geneva Motor Show and private galas. For WEF specifically, our chauffeurs are briefed on the access zones and the security procedures.',
 'Single coordinator for every vehicle\nVehicles staged near the venue\nAccess and security briefing\nReal-time schedule changes\nBranded or unmarked vehicles\nOvernight and standby cover',
 'Quoted per event', 5, 1, 1),

('Weddings', 'weddings',
 'Prestige cars, ribbons and a chauffeur for your day.',
 'One car for the couple, more for the party, and a chauffeur who has done this often enough to stay invisible until the moment he is needed.\n\nWe decorate the car to your colours, arrive early for photographs, and keep to a timeline agreed in advance with you or your planner. A second vehicle can shuttle guests between the ceremony and the reception.',
 'Decorated car in your colours\nEarly arrival for photographs\nTimeline agreed in advance\nChampagne on ice on request\nGuest shuttle vehicles\nRed carpet available',
 'Wedding packages on request', 6, 1, 1),

('Ski Transfers', 'ski-transfers',
 'St. Moritz, Zermatt, Verbier, Gstaad, Davos and more.',
 'Alpine transfers from November to April, in vehicles equipped for the conditions rather than merely permitted in them. Snow tyres as standard, chains carried, and chauffeurs who drive these passes every week of the season.\n\nSki and board carriage is included, and we collect at the chalet door wherever the road allows. For Zermatt we drive to the Tasch terminal and see you onto the shuttle with your luggage.',
 'Snow tyres and chains as standard\nSki and snowboard carriage included\nChalet door collection\nExperienced alpine chauffeurs\nFlight tracking on arrival day\nHeated vehicle waiting for you',
 'Fixed price per transfer', 7, 1, 1);

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
-- Testimonials
-- ---------------------------------------------------------------------
INSERT INTO `testimonials`
(`customer_name`, `country`, `service_label`, `rating`, `review_text`, `source`, `is_approved`, `is_featured`, `sort_order`) VALUES
('James W.',    'United Kingdom', 'Airport transfer · Zurich',  5,
 'Flight landed over an hour late and the chauffeur was still there, waiting, with no fuss and no extra charge. The car was immaculate and I was at my hotel twenty minutes later. Exactly what you want after a long day.', 'google', 1, 1, 1),
('Claudia M.',  'Germany',        'Business travel · Geneva',   5,
 'We used Swiss Tour & Transfer for three days of meetings around Geneva. Same chauffeur every day, always early, and he rearranged the whole afternoon when a meeting overran. Faultless.', 'google', 1, 1, 2),
('Antoine R.',  'France',         'City-to-city · Basel',       5,
 'Booked on WhatsApp in about two minutes and had a fixed price straight back. The drive from Basel to Lucerne was comfortable and quiet, and the price was exactly what was quoted.', 'google', 1, 1, 3),
('Sofia L.',    'Italy',          'Wedding · Lucerne',          5,
 'The Maybach was beautiful and the chauffeur was so calm and kind on a very stressful morning. He had the car decorated exactly as we asked and got us to the church early. Thank you.', 'google', 1, 1, 4),
('Michael T.',  'United States',  'Ski transfer · St. Moritz',  5,
 'Zurich to St. Moritz in a snowstorm. The driver was completely unfazed, the car had proper winter tyres, and we arrived safely and on time. Worth every franc.', 'direct', 1, 1, 5),
('Priya S.',    'Switzerland',    'Events · WEF Davos',         5,
 'They coordinated four vehicles for our team during WEF week. One contact, everything on time, and the drivers knew the access routes better than we did.', 'direct', 1, 0, 6),
('Thomas B.',   'Austria',        'Airport transfer · Geneva',  4,
 'Very good service overall and a comfortable car. Only note is that the pickup point at GVA could have been explained a little more clearly in advance.', 'direct', 0, 0, 7);

-- ---------------------------------------------------------------------
-- Promotions
-- ---------------------------------------------------------------------
INSERT INTO `promotions`
(`title`, `description`, `code`, `placement`, `starts_at`, `ends_at`, `link_type`, `is_active`, `sort_order`) VALUES
('Winter ski transfer season',
 'Book any alpine transfer to St. Moritz, Zermatt, Verbier, Gstaad or Davos and travel in a vehicle equipped with snow tyres and chains as standard. Ski carriage included.',
 'SKI26', 'both', '2025-11-01', '2026-04-30', 'whatsapp', 1, 1),
('Return journey discount',
 'Book your outbound and return airport transfer at the same time and save on the round trip. Applies to all vehicle classes.',
 'RETURN10', 'both', '2026-01-01', '2026-12-31', 'whatsapp', 1, 2);
