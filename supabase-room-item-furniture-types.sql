-- Room item furniture type metadata
-- Run after supabase-home-planning.sql or supabase-measured-layout.sql.

ALTER TABLE room_items ADD COLUMN IF NOT EXISTS furniture_type TEXT;
ALTER TABLE room_items DROP CONSTRAINT IF EXISTS room_items_furniture_type_check;

UPDATE room_items
SET furniture_type = CASE
  WHEN lower(item_name) LIKE '%crib%' THEN 'crib'
  WHEN lower(item_name) LIKE '%sectional%' THEN 'sectional'
  WHEN lower(item_name) LIKE '%sofa%' OR lower(item_name) LIKE '%couch%' OR lower(item_name) LIKE '%loveseat%' THEN 'sofa'
  WHEN lower(item_name) LIKE '%patio chair%' OR lower(item_name) LIKE '%outdoor chair%' OR lower(item_name) LIKE '%adirondack%' THEN 'patio_chair'
  WHEN lower(item_name) LIKE '%bench%' THEN 'bench'
  WHEN lower(item_name) LIKE '%ottoman%' OR lower(item_name) LIKE '%pouf%' THEN 'ottoman'
  WHEN lower(item_name) LIKE '%recliner%' OR lower(item_name) LIKE '%chair%' OR lower(item_name) LIKE '%glider%' OR lower(item_name) LIKE '%stool%' THEN 'chair'
  WHEN lower(item_name) LIKE '%mattress%' OR lower(item_name) LIKE '%bed frame%' OR lower(item_name) LIKE '%bed%' OR lower(item_name) LIKE '%headboard%' THEN 'bed'
  WHEN lower(item_name) LIKE '%patio table%' OR lower(item_name) LIKE '%outdoor table%' THEN 'outdoor_table'
  WHEN lower(item_name) LIKE '%coffee table%' THEN 'coffee_table'
  WHEN lower(item_name) LIKE '%side table%' OR lower(item_name) LIKE '%end table%' OR lower(item_name) LIKE '%nightstand%' THEN 'side_table'
  WHEN lower(item_name) LIKE '%dining%' OR lower(item_name) LIKE '%kitchen table%' OR lower(item_name) LIKE '%table set%' THEN 'dining_table'
  WHEN lower(item_name) LIKE '%desk%' OR lower(item_name) LIKE '%workstation%' THEN 'desk'
  WHEN lower(item_name) LIKE '%dresser%' OR lower(item_name) LIKE '%drawer%' OR lower(item_name) LIKE '%wardrobe%' OR lower(item_name) LIKE '%armoire%' THEN 'dresser'
  WHEN lower(item_name) LIKE '%bookcase%' OR lower(item_name) LIKE '%bookshelf%' OR lower(item_name) LIKE '%shelving%' OR lower(item_name) LIKE '%shelves%' THEN 'bookcase'
  WHEN lower(item_name) LIKE '%tv stand%' OR lower(item_name) LIKE '%media console%' OR lower(item_name) LIKE '%entertainment console%' THEN 'tv_stand'
  WHEN lower(item_name) LIKE '%cabinet%' OR lower(item_name) LIKE '%storage%' OR lower(item_name) LIKE '%trunk%' OR lower(item_name) LIKE '%toy chest%' THEN 'storage'
  WHEN lower(item_name) LIKE '%rug%' OR lower(item_name) LIKE '%runner%' THEN 'rug'
  WHEN lower(item_name) LIKE '%lamp%' OR lower(item_name) LIKE '%lighting%' THEN 'lamp'
  WHEN lower(item_name) LIKE '%plant%' OR lower(item_name) LIKE '%planter%' THEN 'plant'
  WHEN lower(item_name) LIKE '%grill%' OR lower(item_name) LIKE '%barbecue%' OR lower(item_name) LIKE '%bbq%' THEN 'grill'
  WHEN lower(item_name) LIKE '%mirror%' THEN 'mirror'
  WHEN lower(item_name) LIKE '%fridge%' OR lower(item_name) LIKE '%refrigerator%' OR lower(item_name) LIKE '%freezer%' OR lower(item_name) LIKE '%washer%' OR lower(item_name) LIKE '%dryer%' THEN 'appliance'
  WHEN lower(item_name) LIKE '%table%' THEN 'dining_table'
  ELSE 'box'
END
WHERE furniture_type IS NULL
  OR furniture_type NOT IN (
    'bed',
    'crib',
    'sofa',
    'sectional',
    'chair',
    'patio_chair',
    'bench',
    'ottoman',
    'dining_table',
    'outdoor_table',
    'coffee_table',
    'side_table',
    'desk',
    'dresser',
    'bookcase',
    'tv_stand',
    'storage',
    'rug',
    'lamp',
    'plant',
    'grill',
    'mirror',
    'appliance',
    'box'
  );

ALTER TABLE room_items DROP CONSTRAINT IF EXISTS room_items_furniture_type_check;
ALTER TABLE room_items ADD CONSTRAINT room_items_furniture_type_check
  CHECK (furniture_type IS NULL OR furniture_type IN (
    'bed',
    'crib',
    'sofa',
    'sectional',
    'chair',
    'patio_chair',
    'bench',
    'ottoman',
    'dining_table',
    'outdoor_table',
    'coffee_table',
    'side_table',
    'desk',
    'dresser',
    'bookcase',
    'tv_stand',
    'storage',
    'rug',
    'lamp',
    'plant',
    'grill',
    'mirror',
    'appliance',
    'box'
  ));
