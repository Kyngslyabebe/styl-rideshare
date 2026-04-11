-- Marketing content CMS (section-based JSONB)
CREATE TABLE IF NOT EXISTS marketing_content (
  section TEXT PRIMARY KEY,
  content JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marketing testimonials
CREATE TABLE IF NOT EXISTS marketing_testimonials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'rider',
  location TEXT DEFAULT '',
  quote TEXT NOT NULL,
  avatar_url TEXT DEFAULT '',
  rating INTEGER DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact form submissions
CREATE TABLE IF NOT EXISTS marketing_inquiries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE marketing_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read marketing content" ON marketing_content FOR SELECT USING (true);
CREATE POLICY "Public read active testimonials" ON marketing_testimonials FOR SELECT USING (is_active = true);
CREATE POLICY "Public submit inquiry" ON marketing_inquiries FOR INSERT WITH CHECK (true);

-- Seed content
INSERT INTO marketing_content (section, content) VALUES
('header', '{
  "logo_text": "Styl",
  "nav_links": [
    {"label": "About", "anchor": "about"},
    {"label": "Riders", "anchor": "riders"},
    {"label": "Drivers", "anchor": "drivers"},
    {"label": "Testimonials", "anchor": "testimonials"},
    {"label": "Contact", "anchor": "contact"}
  ],
  "cta_text": "Get the App",
  "cta_url": "#download"
}'),
('hero', '{
  "title": "Rides that actually make sense",
  "subtitle": "The rideshare platform where drivers keep every dollar they earn. No commission cuts, no surprises. Just fair rides and honest pay.",
  "cta_primary": "Ride with Styl",
  "cta_secondary": "Drive with Styl",
  "image_url": ""
}'),
('stats', '{
  "items": [
    {"value": "10,000+", "label": "Rides Completed"},
    {"value": "500+", "label": "Active Drivers"},
    {"value": "4.9", "label": "Average Rating"},
    {"value": "0%", "label": "Commission Taken"}
  ]
}'),
('about', '{
  "heading": "Built different, on purpose",
  "text": "Most rideshare platforms take 25 to 40 percent of every fare. We thought that was broken. Styl runs on a simple driver subscription model, which means the person behind the wheel actually gets paid what they deserve. Riders get better service because drivers are happier. Everyone wins.",
  "features": [
    {"title": "Zero commission", "desc": "Drivers keep 100% of every fare they earn"},
    {"title": "Flat subscription", "desc": "Drivers pay a predictable weekly fee instead of per-ride cuts"},
    {"title": "Better for everyone", "desc": "Happy drivers means better rides for passengers"}
  ],
  "image_url": ""
}'),
('how_it_works', '{
  "heading": "Getting around has never been simpler",
  "steps": [
    {"number": "01", "title": "Book your ride", "desc": "Enter your destination, add stops if you need them, and see your fare upfront. No hidden fees."},
    {"number": "02", "title": "Get matched instantly", "desc": "Our matching engine finds the best driver near you. Got a favorite? They get priority."},
    {"number": "03", "title": "Ride and go", "desc": "Track your driver in real time, ride safely with GPS verification, and pay seamlessly through the app."}
  ]
}'),
('riders', '{
  "heading": "Why riders choose Styl",
  "subtitle": "Built around what actually matters to you",
  "features": [
    {"title": "Transparent pricing", "desc": "See your exact fare before you book. What you see is what you pay."},
    {"title": "Favorite drivers", "desc": "Save drivers you love and get matched with them first on future rides."},
    {"title": "Multi-stop rides", "desc": "Need to grab coffee, drop a friend off, then head home? One ride, multiple stops."},
    {"title": "Real-time tracking", "desc": "Watch your driver approach and share your trip with anyone for peace of mind."},
    {"title": "Tip directly", "desc": "100% of your tip goes straight to the driver. Every single cent."},
    {"title": "24/7 support", "desc": "Something off? Our support team responds fast, not with bots."}
  ],
  "image_url": ""
}'),
('drivers', '{
  "heading": "Why drivers switch to Styl",
  "subtitle": "Your time. Your car. Your money.",
  "features": [
    {"title": "Keep 100% of fares", "desc": "No commission. No per-ride fees. Every dollar your rider pays goes to you."},
    {"title": "Predictable costs", "desc": "One flat weekly subscription. Know your costs before you start driving."},
    {"title": "Tips are yours", "desc": "Riders tip often because they know you are not getting squeezed. And you keep all of it."},
    {"title": "Fair matching", "desc": "GPS-verified pickups and dropoffs. No fake rides, no abuse."},
    {"title": "Build your regulars", "desc": "The favorites system means loyal riders find you again and again."},
    {"title": "Drive on your terms", "desc": "Go online when you want, offline when you do not. No minimum hours."}
  ],
  "image_url": ""
}'),
('cta', '{
  "heading": "Ready to ride different?",
  "subtitle": "Download Styl and join the rideshare platform that puts people first.",
  "app_store_url": "#",
  "play_store_url": "#"
}'),
('contact', '{
  "heading": "Get in touch",
  "subtitle": "Questions, partnerships, or just want to say hey. We are real people and we respond.",
  "email": "hello@ridestyl.com",
  "phone": "",
  "address": ""
}'),
('footer', '{
  "tagline": "The rideshare platform where everyone wins.",
  "copyright": "2026 Styl. All rights reserved.",
  "links": [
    {"label": "Privacy Policy", "url": "/privacy"},
    {"label": "Terms of Service", "url": "/terms"},
    {"label": "Driver Agreement", "url": "/driver-agreement"}
  ],
  "social": [
    {"platform": "twitter", "url": "#"},
    {"platform": "instagram", "url": "#"},
    {"platform": "linkedin", "url": "#"}
  ]
}')
ON CONFLICT (section) DO NOTHING;

-- Seed testimonials
INSERT INTO marketing_testimonials (name, role, location, quote, rating, sort_order) VALUES
('Maya Thompson', 'rider', 'Atlanta', 'I have tried every rideshare app in Atlanta and Styl is the only one where my driver actually seemed happy to be there. That energy is contagious.', 5, 1),
('David Chen', 'rider', 'Houston', 'The favorite driver feature is a game changer. I have the same driver take my kids to school three times a week. She knows the route, knows my kids. Can not put a price on that peace of mind.', 5, 2),
('Jasmine Williams', 'rider', 'Dallas', 'No surge pricing nonsense, fair upfront costs, and the multi-stop feature actually works. I can run errands without booking three separate rides.', 5, 3),
('Marcus Rivera', 'driver', 'Miami', 'I drove for two other platforms for three years. I was giving away 30 percent of every ride. With Styl I pay a flat subscription and keep everything I earn. My take-home went up by $400 a week.', 5, 4),
('Tanya Brooks', 'driver', 'Chicago', 'The anti-abuse system means I am not getting flagged for things I did not do. And riders actually tip in this app because they know I am not getting squeezed by the platform.', 5, 5),
('James Okafor', 'driver', 'Phoenix', 'Started driving with Styl part-time on weekends. The subscription model means I know my costs upfront. No guessing, no surprises. Just drive and earn.', 5, 6);
