-- DISABLE RLS TEMPORARILY FOR SEEDING
ALTER TABLE public.events DISABLE ROW LEVEL SECURITY;

-- INSERT SAMPLE EVENTS
INSERT INTO public.events (
  title, description, age_min, age_max, price_type, price,
  location_name, address, lat, lng, city,
  organizer_name, source_url, start_date, end_date,
  category, tags, status, image_urls
) VALUES 
(
  'Warsztaty Robotyki dla Dzieci',
  'Fascynujące warsztaty, podczas których dzieci nauczą się podstaw programowania robotów. Zajęcia prowadzone przez doświadczonych instruktorów.',
  6, 12, 'PAID', 150,
  'Centrum Nauki Kopernik', 'Wybrzeże Kościuszkowskie 20',
  52.2419, 21.0287, 'Warszawa',
  'Centrum Nauki Kopernik', 'https://example.com',
  NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days' + INTERVAL '2 hours',
  'WARSZTATY', ARRAY['robotyka', 'programowanie', 'STEM'],
  'ACTIVE', ARRAY['https://picsum.photos/400/300?random=1']
),
(
  'Spektakl "Czerwony Kapturek"',
  'Klasyczna bajka w nowoczesnym wydaniu. Interaktywny spektakl dla najmłodszych z elementami edukacyjnymi.',
  3, 8, 'PAID', 45,
  'Teatr Lalka', 'ul. Jagiellońska 28',
  52.2537, 21.0352, 'Warszawa',
  'Teatr Lalka', 'https://example.com',
  NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days' + INTERVAL '1 hour',
  'SPEKTAKLE', ARRAY['teatr', 'bajka', 'edukacja'],
  'ACTIVE', ARRAY['https://picsum.photos/400/300?random=2']
),
(
  'Zajęcia Piłkarskie dla Maluchów',
  'Profesjonalne treningi piłkarskie dostosowane do najmłodszych. Rozwijamy koordynację ruchową i uczymy pracy w zespole.',
  4, 10, 'FREE', NULL,
  'Stadion Narodowy', 'Al. Księcia J. Poniatowskiego 1',
  52.2397, 21.0453, 'Warszawa',
  'Akademia Piłkarska', 'https://example.com',
  NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days' + INTERVAL '1.5 hours',
  'SPORT', ARRAY['piłka nożna', 'sport', 'aktywność'],
  'ACTIVE', ARRAY['https://picsum.photos/400/300?random=3']
),
(
  'Warsztaty Plastyczne - Malowanie na Szkle',
  'Kreatywne zajęcia artystyczne, podczas których dzieci stworzą własne dzieła na szkle. Wszystkie materiały zapewnione.',
  5, 14, 'PAID', 80,
  'Dom Kultury Śródmieście', 'ul. Smolna 9',
  52.2297, 21.0122, 'Warszawa',
  'DK Śródmieście', 'https://example.com',
  NOW() + INTERVAL '5 days', NOW() + INTERVAL '5 days' + INTERVAL '3 hours',
  'WARSZTATY', ARRAY['sztuka', 'kreatywność', 'malowanie'],
  'ACTIVE', ARRAY['https://picsum.photos/400/300?random=4']
),
(
  'Lekcja Muzealna - Dinozaury',
  'Interaktywna lekcja w Muzeum Ewolucji. Dzieci poznają historię dinozaurów i wezmą udział w wykopalisku skamielin.',
  6, 15, 'PAID', 35,
  'Muzeum Ewolucji', 'Pałac Kultury i Nauki',
  52.2317, 21.0062, 'Warszawa',
  'Muzeum Ewolucji PAN', 'https://example.com',
  NOW() + INTERVAL '10 days', NOW() + INTERVAL '10 days' + INTERVAL '2 hours',
  'EDUKACJA', ARRAY['nauka', 'historia', 'dinozaury'],
  'ACTIVE', ARRAY['https://picsum.photos/400/300?random=5']
),
(
  'Basen dla Niemowląt',
  'Zajęcia oswajające z wodą dla najmłodszych. Profesjonalni instruktorzy, ciepła woda, bezpieczne warunki.',
  0, 3, 'PAID', 60,
  'Aquapark Warszawianka', 'ul. Merliniego 4',
  52.2847, 20.9606, 'Warszawa',
  'Aquapark', 'https://example.com',
  NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day' + INTERVAL '45 minutes',
  'SPORT', ARRAY['pływanie', 'niemowlęta', 'woda'],
  'ACTIVE', ARRAY['https://picsum.photos/400/300?random=6']
),
(
  'Warsztaty Kulinarne - Pizza Party',
  'Dzieci same przygotują swoją pizzę! Nauka gotowania w przyjaznej atmosferze.',
  5, 12, 'PAID', 120,
  'Kuchnia Malucha', 'ul. Nowy Świat 22',
  52.2345, 21.0187, 'Warszawa',
  'Kuchnia Malucha', 'https://example.com',
  NOW() + INTERVAL '4 days', NOW() + INTERVAL '4 days' + INTERVAL '2.5 hours',
  'WARSZTATY', ARRAY['gotowanie', 'kuchnia', 'pizza'],
  'ACTIVE', ARRAY['https://picsum.photos/400/300?random=7']
);

-- RE-ENABLE RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- FIX RLS POLICY TO ALLOW VIEWING ACTIVE AND DRAFT EVENTS
DROP POLICY IF EXISTS "Events are viewable by everyone" ON public.events;
CREATE POLICY "Events are viewable by everyone" ON public.events
  FOR SELECT USING (true);  -- Allow everyone to view all events