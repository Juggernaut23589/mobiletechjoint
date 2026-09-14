-- Display-name only — slugs (and therefore existing /category/<slug> URLs)
-- are left unchanged.
update categories set name = 'Mounts' where slug = 'tripods-and-mounts';
update categories set name = 'Storage' where slug = 'memory-cards-and-storage';
update categories set name = 'Audio' where slug = 'microphones-and-audio';
