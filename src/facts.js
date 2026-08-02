// Real-world facts shown after each street run (3 per street) and after
// each monument build (3 per landmark). Keyed by city id / landmark id.

export const STREET_FACTS = {
  nyc: [
    [ // Broadway
      'Broadway follows the Wickquasgeck, a Native American trail that predates the city itself.',
      'Its Theatre District earned the nickname "The Great White Way" from its early electric billboards.',
      'Broadway runs about 13 miles through Manhattan — one of the longest streets in New York.',
    ],
    [ // 5th Avenue
      '5th Avenue is regularly ranked among the most expensive shopping streets on Earth.',
      'It divides Manhattan: every "East" and "West" street address is measured from 5th Avenue.',
      'Its "Museum Mile" stretch holds nine museums, including the Met and the Guggenheim.',
    ],
    [ // Times Square
      'Times Square is named after The New York Times, which moved there in 1904.',
      'The New Year\'s Eve ball has dropped at One Times Square since 1907.',
      'Zoning rules here actually REQUIRE buildings to display bright illuminated signs.',
    ],
  ],
  paris: [
    [ // Champs-Élysées
      'The name means "Elysian Fields" — the paradise of Greek mythology.',
      'It runs 1.9 km from Place de la Concorde up to the Arc de Triomphe.',
      'The Tour de France has finished on this avenue almost every year since 1975.',
    ],
    [ // Rue de Rivoli
      'The street is named after Napoleon\'s 1797 victory at the Battle of Rivoli.',
      'Its uniform arcaded facades were among the first planned streetscapes in Paris.',
      'It runs beside the Louvre and the Tuileries Garden for over a kilometre.',
    ],
    [ // Montmartre
      'Montmartre is the highest point in Paris — about 130 m, crowned by Sacré-Cœur.',
      'Picasso, Van Gogh and Renoir all lived and worked in this hilltop village.',
      'The name likely means "Mount of Martyrs", for Saint Denis, beheaded here in 250 AD.',
    ],
  ],
  london: [
    [ // Oxford Street
      'Oxford Street is Europe\'s busiest shopping street, with around half a million visitors a day.',
      'It follows the line of a Roman road, the Via Trinobantina.',
      'Roughly 300 shops line its 1.9 km — including flagship department stores over a century old.',
    ],
    [ // Abbey Road
      'The Beatles\' 1969 album cover made this zebra crossing world-famous.',
      'The crossing is Grade II listed — legally protected as a heritage site.',
      'Abbey Road Studios has hosted everyone from Elgar to Pink Floyd to film-score orchestras.',
    ],
    [ // Piccadilly
      'The name comes from "piccadills" — fancy collars sold by a 17th-century tailor here.',
      'The famous statue at Piccadilly Circus is called Eros, but actually depicts Anteros.',
      'Its giant illuminated signs have glowed over the Circus since 1908.',
    ],
  ],
  rome: [
    [ // Via del Corso
      'The "Corso" is named after the wild riderless horse races run here during Carnival.',
      'It runs dead straight for 1.6 km — rare in Rome\'s tangle of streets.',
      'It follows the ancient Via Lata, a stretch of the Roman Via Flaminia.',
    ],
    [ // Via Veneto
      'This was the heart of the 1960s "Dolce Vita" — Fellini set scenes of the film here.',
      'Its full name, Via Vittorio Veneto, honours a decisive WWI battle.',
      'The street curves past Porta Pinciana, a gate in Rome\'s 1,700-year-old Aurelian Walls.',
    ],
    [ // Piazza Navona
      'The square keeps the oval shape of the ancient Stadium of Domitian beneath it.',
      'Bernini\'s Fountain of the Four Rivers carries a real Egyptian-style obelisk.',
      'For 200 years the piazza was flooded on purpose each August for water festivals.',
    ],
  ],
};

export const MONUMENT_FACTS = {
  empire: [
    'Built in just 410 days during the Great Depression, opening in 1931.',
    'At 381 m (102 storeys) it was the world\'s tallest building for nearly 40 years.',
    'Lightning strikes the building around 20–25 times every year.',
  ],
  chrysler: [
    'Its 56 m spire was secretly assembled inside the building, then raised in 90 minutes to snatch the world-height record.',
    'The Art Deco crown is stainless steel arranged in sunburst arches.',
    'Its eagle gargoyles were modelled on 1929 Chrysler car hood ornaments.',
  ],
  brooklyn: [
    'When it opened in 1883 it was the longest suspension bridge in the world.',
    'It was the first suspension bridge to use steel wire cables.',
    'In 1884, P.T. Barnum marched 21 elephants across it to prove it was safe.',
  ],
  eiffel: [
    'Built for the 1889 World\'s Fair — and meant to be torn down after 20 years.',
    'Its 18,038 iron pieces are held together by 2.5 million rivets.',
    'Summer heat makes the tower grow about 15 cm taller.',
  ],
  arc: [
    'Napoleon ordered it in 1806 — but it was only finished in 1836, after his death.',
    'The names of 660 of his generals are engraved on its walls.',
    'France\'s Tomb of the Unknown Soldier has burned an eternal flame here since 1923.',
  ],
  louvre: [
    'Architect I. M. Pei\'s glass pyramid opened in 1989 — to fierce controversy, now beloved.',
    'It contains 673 glass panes (the rumour of 666 is a myth).',
    'The Louvre is the most-visited museum in the world.',
  ],
  bigben: [
    '"Big Ben" is the 13.7-tonne bell — the tower itself is the Elizabeth Tower.',
    'The clock\'s accuracy is fine-tuned by stacking old penny coins on its pendulum.',
    'Completed in 1859, the 96 m tower leans very slightly — about 0.26 degrees.',
  ],
  towerbridge: [
    'Opened in 1894, its bascules still lift around 800 times a year for ships.',
    'The original lifting machinery ran on steam-powered hydraulics.',
    'Tourists often confuse it with London Bridge — the much plainer bridge next door.',
  ],
  eye: [
    'At 135 m, it was the world\'s tallest observation wheel when it opened in 2000.',
    'It has 32 capsules — one for each London borough — numbered 1 to 33, skipping unlucky 13.',
    'It moves so slowly (0.9 km/h) that it usually doesn\'t stop for boarding.',
  ],
  colosseum: [
    'Completed in AD 80, it could hold around 50,000 spectators.',
    'Early on, the arena could be flooded to stage mock naval battles.',
    'A giant canvas awning, the velarium, could be rigged to shade the crowd.',
  ],
  trevi: [
    'The fountain is fed by the Aqua Virgo, an aqueduct built in 19 BC.',
    'Around €1.5 million in coins is tossed in each year — all collected for charity.',
    'Legend: one coin means you\'ll return to Rome; two, romance; three, marriage.',
  ],
  pantheon: [
    'Rebuilt by Emperor Hadrian around AD 126 — in continuous use for 1,900 years.',
    'Its dome is still the largest unreinforced concrete dome ever built.',
    'The only light source is the 8.2 m oculus — the floor has drains for rain.',
  ],
};
