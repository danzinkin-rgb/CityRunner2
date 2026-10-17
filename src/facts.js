// Facts shown after each street run and after each monument build.
//
// Each fact carries an optional pulled-out statistic — { big, unit, label } —
// so the screen can lead with a large animated number rather than a wall of
// small text. `scale` on a monument drives the height-comparison graphic.

export const STREET_FACTS = {
  nyc: [
    { street: 'Broadway', tag: 'The Great White Way',
      facts: [
        { big: '13', unit: 'miles', label: 'end to end', text: 'Broadway runs the full length of Manhattan and keeps going — one of the longest streets in New York.' },
        { big: '1880', label: 'first electric lights', text: 'Its blaze of early electric billboards earned the Theatre District the nickname "The Great White Way".' },
        { text: 'The road follows the Wickquasgeck Trail, a Native American path that predates the city itself.' },
      ] },
    { street: '5th Avenue', tag: 'The most expensive mile',
      facts: [
        { big: '9', unit: 'museums', label: 'on Museum Mile', text: 'The stretch beside Central Park holds nine museums, including the Met and the Guggenheim.' },
        { big: '#1', label: 'priciest retail on earth', text: '5th Avenue is regularly ranked the most expensive shopping street in the world.' },
        { text: 'It divides Manhattan in two: every "East" and "West" address is measured from here.' },
      ] },
    { street: 'Times Square', tag: 'Where the lights never go out',
      facts: [
        { big: '1907', label: 'first ball drop', text: 'The New Year\'s Eve ball has dropped at One Times Square every year since 1907.' },
        { big: '330k', unit: 'people', label: 'pass through daily', text: 'On a busy day a third of a million people cross the square.' },
        { text: 'Zoning law here does not merely permit bright illuminated signs — it requires them.' },
      ] },
  ],
  paris: [
    { street: 'Champs-Élysées', tag: 'The Elysian Fields',
      facts: [
        { big: '1.9', unit: 'km', label: 'Concorde to the Arc', text: 'The avenue climbs in a straight line from Place de la Concorde to the Arc de Triomphe.' },
        { big: '1975', label: 'Tour de France finish', text: 'The Tour has ended on these cobbles almost every year since 1975.' },
        { text: 'Its name means "Elysian Fields" — the paradise of Greek mythology.' },
      ] },
    { street: 'Rue de Rivoli', tag: 'A mile of arcades',
      facts: [
        { big: '1797', label: 'the battle it is named for', text: 'The street commemorates Napoleon\'s victory at the Battle of Rivoli.' },
        { big: '3', unit: 'km', label: 'of arcaded frontage', text: 'Its uniform arcades run beside the Louvre and the Tuileries for three kilometres.' },
        { text: 'These were among the first deliberately planned streetscapes in Paris.' },
      ] },
    { street: 'Montmartre', tag: 'The village on the hill',
      facts: [
        { big: '130', unit: 'm', label: 'the highest point in Paris', text: 'The hill rises above the whole city, crowned by the white domes of Sacré-Cœur.' },
        { big: '250', unit: 'AD', label: 'the martyrdom', text: 'The name likely means "Mount of Martyrs", for Saint Denis, beheaded here.' },
        { text: 'Picasso, Van Gogh and Renoir all painted in this hilltop village.' },
      ] },
  ],
  london: [
    { street: 'Oxford Street', tag: 'Europe\'s busiest shopping street',
      facts: [
        { big: '500k', unit: 'visitors', label: 'on a busy day', text: 'Half a million people walk Oxford Street daily — more than any other shopping street in Europe.' },
        { big: '300', unit: 'shops', label: 'in 1.9 km', text: 'Three hundred shops line under two kilometres of road.' },
        { text: 'It follows the course of a Roman road, the Via Trinobantina.' },
      ] },
    { street: 'Abbey Road', tag: 'The most famous crossing in the world',
      facts: [
        { big: '1969', label: 'the album cover', text: 'The Beatles photographed the cover here in ten minutes, on 8 August 1969.' },
        { big: 'II', label: 'listed heritage grade', text: 'The zebra crossing is Grade II listed — legally protected as a heritage site.' },
        { text: 'Abbey Road Studios has recorded everyone from Elgar to Pink Floyd to film orchestras.' },
      ] },
    { street: 'Piccadilly', tag: 'Lit since 1908',
      facts: [
        { big: '1908', label: 'first illuminated sign', text: 'Giant advertising signs have glowed over Piccadilly Circus for more than a century.' },
        { big: '17th', unit: 'century', label: 'the tailor\'s collars', text: 'The name comes from "piccadills" — fancy collars sold by a tailor who grew rich here.' },
        { text: 'The famous statue is known as Eros, but actually depicts his brother Anteros.' },
      ] },
  ],
  rome: [
    { street: 'Via del Corso', tag: 'The straightest street in Rome',
      facts: [
        { big: '1.6', unit: 'km', label: 'dead straight', text: 'It runs arrow-straight through a city famous for its tangle of lanes.' },
        { big: '15th', unit: 'century', label: 'the riderless races', text: 'The "Corso" is named for the wild riderless horse races run down it at Carnival.' },
        { text: 'It follows the ancient Via Lata, part of the Roman Via Flaminia.' },
      ] },
    { street: 'Via Veneto', tag: 'La Dolce Vita',
      facts: [
        { big: '1960', label: 'the film that made it famous', text: 'Fellini set La Dolce Vita here, and the street became shorthand for glamour.' },
        { big: '1,700', unit: 'years', label: 'of city wall', text: 'It curves past Porta Pinciana, a gate in the Aurelian Walls.' },
        { text: 'Its full name, Via Vittorio Veneto, honours a decisive First World War battle.' },
      ] },
    { street: 'Piazza Navona', tag: 'A stadium beneath your feet',
      facts: [
        { big: '30k', unit: 'spectators', label: 'in the stadium below', text: 'The square keeps the exact oval of the Stadium of Domitian, buried beneath it.' },
        { big: '200', unit: 'years', label: 'of August floodings', text: 'For two centuries the piazza was deliberately flooded each August for water festivals.' },
        { text: 'Bernini\'s Fountain of the Four Rivers carries a genuine Egyptian-style obelisk.' },
      ] },
  ],
  sf: [
    { street: 'Lombard Street', tag: 'The crooked street',
      facts: [
        { big: '8', unit: 'bends', label: 'in one block', text: 'Lombard Street squeezes eight hairpin bends into a single steep block on Russian Hill.' },
        { big: '1922', label: 'the bends were built', text: 'The bends were added in 1922 because the hill was too steep to drive straight down.' },
        { text: 'The road is paved in red brick and lined with flowerbeds on every bend.' },
      ] },
    { street: 'Market Street', tag: 'The city\'s main street',
      facts: [
        { big: '4.8', unit: 'km', label: 'end to end', text: 'Market Street runs about 4.8 km from the Ferry Building on the bay towards Twin Peaks.' },
        { big: '1847', label: 'laid out', text: 'It was laid out in 1847, the year the town changed its name from Yerba Buena to San Francisco.' },
        { text: 'Its historic streetcars were collected from cities all over the world, and still carry passengers.' },
      ] },
    { street: 'Haight-Ashbury', tag: 'The Summer of Love',
      facts: [
        { big: '1967', label: 'the Summer of Love', text: 'In the summer of 1967 around 100,000 young people came here for music and art.' },
        { big: '1906', label: 'the earthquake it survived', text: 'Many of its wooden Victorian houses survived the great earthquake and fire of 1906.' },
        { text: 'The name comes from the corner where two streets meet: Haight Street and Ashbury Street.' },
      ] },
  ],
  // Approved by Dan, 27 September 2026: docs/cities/mexico-city.md §3,
  // sources listed there.
  mexico: [
    { street: 'Paseo de la Reforma', tag: 'A boulevard built for an emperor',
      facts: [
        { big: '15', unit: 'km', label: 'end to end', text: 'Paseo de la Reforma runs fifteen kilometres across the city, from the historic centre to Chapultepec park.' },
        { big: '1865', label: 'first laid out', text: 'Emperor Maximilian ordered the avenue built to link his palace downtown with his home at Chapultepec Castle.' },
        { text: 'Its grand traffic circles, called glorietas, were added decades later, under President Porfirio Díaz.' },
      ] },
    { street: 'Coyoacán', tag: 'The place of coyotes',
      facts: [
        { big: '1521', label: "Cortés' first headquarters", text: 'After the fall of the Aztec capital, Hernán Cortés set up his first base here while Mexico City was rebuilt.' },
        { big: '1907', label: "Frida Kahlo's birthplace", text: "Painter Frida Kahlo was born in Coyoacán's Blue House, which is now a museum of her life and work." },
        { text: "Coyoacán means 'place of coyotes' in the Nahuatl language, and a coyote fountain still marks the main plaza." },
      ] },
    { street: 'Xochimilco', tag: 'The floating gardens',
      facts: [
        { big: '170', unit: 'km', label: 'of canals', text: "Xochimilco's canals stretch about 170 kilometres — nearly all that survives of the lake the Aztecs once sailed." },
        { big: '1987', label: 'named a World Heritage Site', text: "UNESCO protects Xochimilco's floating gardens alongside the historic centre of Mexico City." },
        { text: 'The gardens are built on chinampas — islands woven from lake mud and reeds — and farmers still grow flowers on them today.' },
      ] },
  ],
  // Marrakech: approved by Dan, 13 October 2026 (docs/MARRAKECH-FACTS-DRAFT.md,
  // sources listed there).
  marrakech: [
    { street: 'Jemaa el-Fnaa', tag: 'The square that never sleeps',
      facts: [
        { big: '2001', label: 'honoured by UNESCO', text: "In 2001 UNESCO named the square's storytellers, musicians and performers a Masterpiece of the Oral and Intangible Heritage of Humanity, one of the very first." },
        { big: '1985', label: 'World Heritage Site', text: 'The old walled city around the square, the medina, has been a UNESCO World Heritage Site since 1985.' },
        { text: 'Storytellers still gather their listeners in a circle called a halqa and tell tales that have been passed on by word of mouth for centuries.' },
      ] },
    { street: 'The Souks', tag: 'A maze of markets',
      facts: [
        { text: "Souk Semmarine, the main lane of the souks, is roofed with a long iron trellis that keeps the shops in shade." },
        { text: "In the dyers' souk, freshly dyed wool is hung across the alleys to dry in bright streamers of colour." },
        { text: 'Each part of the souks has its own trade: one for wool in the morning, one for spices and remedies, one for slippers, one for lanterns.' },
      ] },
    { street: 'The Mellah', tag: 'The old Jewish quarter',
      facts: [
        { big: '1558', label: 'founded', text: 'The Mellah was founded around 1558, beside the royal palace, as the Jewish quarter of the city.' },
        { big: '400', unit: 'years', label: 'a community', text: 'For four centuries it was home to one of the largest Jewish communities in Morocco. In the decades after 1948 most of its families emigrated, the greater part to Israel, others to France and Canada.' },
        { text: 'The Lazama Synagogue, built around a tiled courtyard in the heart of the quarter, still stands and is open to visitors.' },
      ] },
  ],
  // Delhi: approved by Dan, 13 October 2026 (docs/DELHI-FACTS-DRAFT.md,
  // sources listed there).
  delhi: [
    { street: 'Chandni Chowk', tag: 'The moonlit square',
      facts: [
        { big: '1650', label: 'laid out', text: 'Princess Jahanara, daughter of Emperor Shah Jahan, designed the market in 1650, leading up to the gates of the Red Fort.' },
        { text: "Its name means 'moonlit square': a pool in the middle of the street once reflected the moon." },
        { text: 'A canal once ran down the centre of the street. Today it is one of the biggest wholesale markets in India.' },
      ] },
    { street: 'Connaught Place', tag: 'Rings of white colonnades',
      facts: [
        { big: '1933', label: 'completed', text: 'Built between 1929 and 1933, it was named after the Duke of Connaught, a son of Queen Victoria.' },
        { text: 'Architect Robert Tor Russell set its white colonnades in rings around a central park.' },
        { text: 'The design was modelled on the Royal Crescent, a curving terrace of houses in the English city of Bath.' },
      ] },
    { street: 'Kartavya Path', tag: 'The path of duty',
      facts: [
        { big: '2022', label: 'renamed', text: "First called Kingsway and then Rajpath, the avenue was renamed Kartavya Path, 'the path of duty', in 2022." },
        { text: "It runs from India Gate to Rashtrapati Bhavan, the President's house, between long lawns and canals." },
        { text: 'Every year on 26 January, the Republic Day parade marches along it.' },
      ] },
  ],
  // Bangkok: approved by Dan, 13 October 2026 (docs/BANGKOK-FACTS-DRAFT.md,
  // sources listed there).
  bangkok: [
    { street: 'Yaowarat Road', tag: "Bangkok's Chinatown",
      facts: [
        { big: '1.5', unit: 'km', label: 'long', text: "Yaowarat Road runs about one and a half kilometres through the heart of Bangkok's Chinatown." },
        { big: '1891', label: 'ordered', text: 'King Chulalongkorn ordered the road built in 1891, over land that had been rice fields and canals.' },
        { text: 'It bends because it was laid out around the homes already there. People say it looks like the body of a dragon.' },
      ] },
    { street: 'Khao San Road', tag: 'The rice street',
      facts: [
        { big: '410', unit: 'm', label: 'long', text: 'Khao San Road is only about 410 metres long.' },
        { text: "Its name means 'milled rice': by the end of the 1800s this district was the biggest rice market in the country." },
        { text: 'Rice came up the Chao Phraya River on barges and was unloaded at a canal nearby.' },
      ] },
    { street: 'Khlong Bang Luang', tag: 'Life by the canal',
      facts: [
        { text: "Bangkok was once called the 'Venice of the East', because canals, called khlongs, crossed the whole city." },
        { big: '1,682', label: 'canals', text: 'In 2019 the city counted 1,682 canals, with 2,604 kilometres of waterways between them.' },
        { text: 'Many canals were filled in to make roads, but in places like Bang Luang, wooden houses still stand right on the water.' },
      ] },
  ],
  // Cape Town: approved by Dan, 13 October 2026 (docs/CAPE-TOWN-FACTS-DRAFT.md,
  // sources listed there).
  capetown: [
    { street: 'Bo-Kaap', tag: 'The painted hillside',
      facts: [
        { big: '1763', label: 'first houses', text: 'Jan de Waal began building houses to rent here in 1763. One of the first, on Wale Street, is now the Bo-Kaap Museum.' },
        { text: 'It has more buildings from before 1850 than anywhere else in South Africa.' },
        { text: 'Its houses are painted in bright colours. Many people say they were first painted to celebrate freedom when slavery ended.' },
      ] },
    { street: 'Long Street', tag: 'Iron-lace balconies',
      facts: [
        { text: 'Long Street is lined with Victorian buildings with wrought-iron balconies over the pavement.' },
        { text: 'In the 1970s, local architects and preservation groups saved it from being knocked down.' },
        { text: 'It once marked the edge of the Bo-Kaap, the neighbourhood on the hill above it.' },
      ] },
    { street: 'V&A Waterfront', tag: 'The working harbour',
      facts: [
        { big: '1860', label: 'harbour begun', text: "Prince Alfred, Queen Victoria's son, tipped the first load of stone for the harbour's breakwater in 1860." },
        { text: 'The Waterfront is named after both of them: Victoria and Alfred.' },
        { text: 'It is still a working harbour, with fishing boats and tugs moored among the shops and restaurants.' },
      ] },
  ],
  // Hanoi: approved by Dan, 13 October 2026 (docs/HANOI-FACTS-DRAFT.md,
  // sources listed there).
  hanoi: [
    { street: 'Hang Gai', tag: 'The silk street',
      facts: [
        { text: "Hanoi's Old Quarter is called the 36 Streets. Each street was named after the trade of the guild that worked there." },
        { text: "'Hang' means goods. Hang Gai was a centre of the silk trade, and it is still known for silk and tailors." },
        { text: 'The number 36 is not exact: the Old Quarter has more streets than that today.' },
      ] },
    { street: 'Train Street', tag: 'Houses beside the rails',
      facts: [
        { big: '1902', label: 'railway built', text: 'The railway through here was built in 1902, and trains still run along it.' },
        { text: 'The houses stand so close to the rails that people step back into their doorways when a train goes by.' },
        { text: 'In 2019 the cafés along the tracks were closed to visitors for safety. They reopened in 2023 under stricter rules.' },
      ] },
    { street: 'Hoan Kiem Lake', tag: 'The lake of the returned sword',
      facts: [
        { text: "Hoan Kiem means 'lake of the returned sword'." },
        { big: '1428', label: 'the legend', text: 'The story goes that in 1428 a golden turtle rose from the lake and took back the magic sword Emperor Le Loi had used to win his war.' },
        { text: "Before the legend, the lake was called Luc Thuy, 'green water'." },
      ] },
  ],
  // Seoul: approved by Dan, 13 October 2026 (docs/SEOUL-FACTS-DRAFT.md,
  // sources listed there).
  seoul: [
    { street: 'Insadong', tag: 'Tea, paper and pottery',
      facts: [
        { big: '500', unit: 'years', label: 'old', text: 'Insadong began about 500 years ago as a neighbourhood where government officials lived.' },
        { text: "In the 1900s it became the city's street of antique shops, and today it is full of galleries, tea houses and craft shops." },
        { text: 'Tongmungwan, on this street, is the oldest bookshop in Seoul.' },
      ] },
    { street: 'Bukchon Hanok Village', tag: 'Roofs of grey tile',
      facts: [
        { text: 'Bukchon sits on the hill between two royal palaces, Gyeongbokgung and Changdeokgung.' },
        { text: 'Hundreds of hanok, traditional houses of timber and plaster under curved tile roofs, still stand in its lanes.' },
        { text: 'People still live here, so visitors are asked to keep their voices down as they walk through.' },
      ] },
    { street: 'Myeongdong', tag: 'The shopping streets',
      facts: [
        { text: 'In the days of the Joseon kings it was a quiet neighbourhood of homes, called Myeongryebang.' },
        { big: '1898', label: 'the cathedral', text: 'Myeongdong Cathedral, at the top of the hill, was finished in 1898.' },
        { text: 'Every evening, street-food stalls set up down the middle of its lanes.' },
      ] },
  ],
  // Samarkand: approved by Dan, 13 October 2026 (docs/SAMARKAND-FACTS-DRAFT.md,
  // sources listed there).
  samarkand: [
    { street: 'Tashkent Street', tag: 'On the Silk Road',
      facts: [
        { text: 'Samarkand stood on the Silk Road, the old trade routes that ran between China and the Mediterranean.' },
        { big: '2001', label: 'World Heritage', text: "UNESCO listed the old city in 2001 as 'Samarkand, Crossroads of Cultures'." },
        { text: 'This street links the Registan with the great Bibi-Khanym Mosque and the bazaar beside it.' },
      ] },
    { street: 'Siab Bazaar', tag: 'The great market',
      facts: [
        { text: 'Siab Bazaar is the largest market in Samarkand.' },
        { text: 'It takes its name from the Siab, the small river that flows beside it.' },
        { text: 'Its stalls sell melons, dried fruit, nuts, spices, and the round patterned bread the city is known for.' },
      ] },
    { street: 'Registan Square', tag: 'The sandy place',
      facts: [
        { text: "Registan means 'sandy place'. It was the heart of the old city, where people gathered to hear announcements." },
        { big: '1660', label: 'last madrasa finished', text: 'Its three madrasas, or schools, were built over more than two centuries, from 1417 to 1660.' },
        { text: 'All three face the square, each behind a great tiled gate.' },
      ] },
  ],
  // Zanzibar: approved by Dan, 13 October 2026 (docs/ZANZIBAR-FACTS-DRAFT.md,
  // sources listed there).
  zanzibar: [
    { street: 'Kenyatta Road', tag: 'The carved doors',
      facts: [
        { big: '2000', label: 'World Heritage', text: 'UNESCO listed Stone Town in 2000 for its mix of African, Arab, Persian, Indian and European building.' },
        { text: 'Its houses are famous for their carved wooden doors, many studded with brass.' },
        { text: 'Doors in the Indian style have rounded tops; those in the Omani Arab style are square.' },
      ] },
    { street: 'Darajani Market', tag: 'The main market',
      facts: [
        { big: '1904', label: 'market hall built', text: "The covered market hall was built in 1904. People here call it Marikiti Kuu, 'the main market'." },
        { text: 'Its stalls sell spices, fresh fish, fruit, and almost everything else.' },
        { text: 'The dala dalas, small trucks turned into buses, leave for the rest of the island from beside it.' },
      ] },
    { street: 'Forodhani Gardens', tag: 'The seafront',
      facts: [
        { text: "Forodhani means 'customs': the gardens lie by the island's old customs house." },
        { text: 'Every evening the gardens become an open-air food market, with grilled seafood and sugar-cane juice.' },
        { text: 'The old palaces of the sultans line the seafront here, looking out over the harbour.' },
      ] },
  ],
  // Beijing: approved by Dan, 13 October 2026 (docs/BEIJING-FACTS-DRAFT.md,
  // sources listed there).
  beijing: [
    { street: 'Nanluoguxiang', tag: 'A hutong lane',
      facts: [
        { big: '700', unit: 'years', label: 'old', text: 'This lane was laid out more than 700 years ago, when Kublai Khan made Beijing his capital.' },
        { text: "It was named for its shape: it is higher in the middle than at either end, like a hunched back ('luoguo')." },
        { text: 'Lanes like this, called hutongs, run between the walls of old courtyard houses.' },
      ] },
    { street: 'Wangfujing', tag: 'The shopping street',
      facts: [
        { text: "Its name means 'well of the princes' mansions': a well here served the homes of princes." },
        { text: 'There have been shops on this street for more than four hundred years.' },
        { big: '1999', label: 'car-free', text: 'In 1999 and 2000 most of the street was made pedestrian-only.' },
      ] },
    { street: 'Qianmen Street', tag: 'South of the front gate',
      facts: [
        { text: "It runs south from Qianmen, the 'front gate' of the old inner city." },
        { big: '600', unit: 'years', label: 'of shops', text: 'Shops have lined this street for almost 600 years.' },
        { text: 'Some of the oldest shops in Beijing stand here, known for roast duck, tea, silk, shoes and hats.' },
      ] },
  ],
  // Havana: approved by Dan, 13 October 2026 (docs/HAVANA-FACTS-DRAFT.md,
  // sources listed there).
  havana: [
    { street: 'Malecón', tag: 'The sea wall',
      facts: [
        { big: '1901', label: 'begun', text: 'Building of the Malecón began in 1901, to protect the city from the sea.' },
        { big: '7', unit: 'km', label: 'of sea wall', text: 'It runs for about seven kilometres along the shore, built in stages over more than fifty years.' },
        { text: 'In rough weather, waves break right over the wall and across the road.' },
      ] },
    { street: 'Calle Obispo', tag: 'The bishop\'s street',
      facts: [
        { text: 'Calle Obispo goes back to the 1500s, one of the oldest streets in Old Havana.' },
        { text: "It has had many names, among them Pi Margall from 1905, but in 1936 it went back to Obispo, 'bishop'." },
        { big: '1982', label: 'World Heritage', text: 'Old Havana and its forts were listed by UNESCO in 1982.' },
      ] },
    { street: 'Paseo del Prado', tag: 'The promenade',
      facts: [
        { big: '1772', label: 'begun', text: 'The Paseo del Prado was begun in 1772, a tree-lined promenade outside the old city walls.' },
        { text: 'Its raised walk down the middle is lined with trees, marble benches and bronze lions.' },
        { text: 'The lions were cast in 1928 from the metal of old cannons.' },
      ] },
  ],
  // Istanbul: approved by Dan, 13 October 2026 (docs/ISTANBUL-FACTS-DRAFT.md,
  // sources listed there).
  istanbul: [
    { street: 'İstiklal Avenue', tag: 'The tram street',
      facts: [
        { big: '1.4', unit: 'km', label: 'long', text: 'İstiklal Avenue runs about 1.4 kilometres, from Taksim Square down to Tünel.' },
        { big: '1871', label: 'first trams', text: 'Trams have run along here since 1871, pulled by horses until electric trams came in 1914.' },
        { text: 'Today a little red heritage tram still rattles down the middle of the street.' },
      ] },
    { street: 'Grand Bazaar', tag: 'A city under one roof',
      facts: [
        { big: '1455', label: 'begun', text: 'Sultan Mehmed II began the Grand Bazaar around 1455.' },
        { big: '61', unit: 'streets', label: 'under its roofs', text: 'About 61 covered streets run through it, lined with thousands of shops.' },
        { text: 'In 1890 a count found 4,399 shops at work here.' },
      ] },
    { street: 'Divanyolu', tag: 'The road to the council',
      facts: [
        { text: 'Divanyolu follows the Mese, the main street laid out by Emperor Constantine in the 300s.' },
        { text: 'Under the Ottomans it led to the Divan, the imperial council at Topkapı Palace, and that gave it its name.' },
        { text: 'At its start stood the Milion, the marker from which distances across the empire were measured.' },
      ] },
  ],
  // Chicago: approved by Dan, 13 October 2026 (docs/CHICAGO-FACTS-DRAFT.md,
  // sources listed there).
  chicago: [
    { street: 'Michigan Avenue', tag: 'North of the river',
      facts: [
        { text: 'This stretch of Michigan Avenue runs about a mile north from the Chicago River, lined with shops, hotels and towers.' },
        { text: 'It was once a narrow road called Pine Street. It grew into a grand avenue after a double-decked bridge opened over the river in 1920.' },
        { big: '1920', label: 'the bridge', text: 'That bridge is a bascule bridge: its two halves tip up to let tall boats through.' },
      ] },
    { street: 'The Loop', tag: 'Under the tracks',
      facts: [
        { big: '1897', label: 'the Loop opened', text: "In 1897 the elevated railway's loop of track opened over the streets of downtown Chicago." },
        { text: "The tracks run round a rectangle of streets, and that loop gave the whole downtown its name: the Loop." },
        { text: 'It is one of only a few city railways that have kept running, day in, day out, for well over a century.' },
      ] },
    { street: 'Wacker Drive', tag: 'Along the river',
      facts: [
        { text: 'Wacker Drive runs along the Chicago River, and has a second road on a lower level beneath it.' },
        { big: '37', unit: 'bridges', label: 'that move', text: 'Chicago has 37 bridges that open to let boats through, by most counts more than any other city in the world.' },
        { text: "Most are bascule bridges, a design so common here that it is called the 'Chicago type'." },
      ] },
  ],
  // New Orleans: approved by Dan, 17 October 2026 (docs/NEW-ORLEANS-FACTS-DRAFT.md,
  // sources listed there).
  neworleans: [
    { street: 'Royal Street', tag: 'Iron lace and antiques',
      facts: [
        { big: '1718', label: 'city founded', text: 'New Orleans was founded in 1718 and grew around the square now called Jackson Square. Royal Street was laid out in its first years.' },
        { big: '80', unit: '%', label: 'burned', text: 'Great fires in 1788 and 1794 destroyed 80% of the city, so nearly all of the French Quarter was built from the late 1790s on, much of it under Spanish rule.' },
        { text: 'Royal Street is known for its antique shops and art galleries.' },
      ] },
    { street: 'St. Charles Avenue', tag: 'The parade route',
      facts: [
        { big: '1835', label: 'streetcar', text: 'The St. Charles streetcar has run since 1835: the oldest streetcar line still running in the world.' },
        { text: 'It is one of the main Mardi Gras parade routes, lined with mansions and live oaks planted in the early 1900s.' },
        { big: '1857', label: 'the first floats', text: 'In 1857 the Mistick Krewe of Comus brought torch-lit processions and themed floats to Mardi Gras.' },
      ] },
    { street: 'Decatur Street', tag: 'Along the river',
      facts: [
        { text: 'Decatur Street runs beside the Mississippi. It was once Levee Street, and was renamed in 1870, after the river had shifted its course.' },
        { big: '1791', label: 'the market', text: 'Part of the French Market has been a market since 1791. Its oldest buildings date from about 1813.' },
        { big: '1988', label: 'riverfront line', text: 'The Riverfront streetcar line opened in 1988, the first new streetcar line in the city in 62 years.' },
      ] },
  ],
  // Venice: approved by Dan, 15 October 2026 (docs/VENICE-FACTS-DRAFT.md,
  // sources listed there).
  venice: [
    { street: 'Strada Nova', tag: 'The new street',
      facts: [
        { big: '1871', label: 'opened', text: 'The Strada Nova, the "new street", opened in 1871, cut through old houses to make one walk from the Rialto to the railway station.' },
        { big: '472', unit: 'bridges', label: 'in the city', text: 'Venice is built on 126 islands, joined by 472 bridges.' },
        { text: "There are no cars in the old city. Goods go round on porters' trolleys, and by boat." },
      ] },
    { street: 'Zattere', tag: 'The long quay',
      facts: [
        { big: '1', unit: 'km', label: 'of quay', text: 'The Zattere runs for about a kilometre along the Giudecca Canal, to the point where it meets the basin of San Marco.' },
        { text: 'Its name means rafts: salt, timber and coal were once floated down the canal on rafts and landed here.' },
        { big: '400', unit: 'gondolas', label: 'today', text: 'In the 1500s Venice had about 10,000 gondolas and boats like them. Today there are about 400 gondolas.' },
      ] },
    { street: 'Riva degli Schiavoni', tag: 'The waterfront',
      facts: [
        { text: 'It is named after the merchants of Dalmatia, then called Schiavonia, who landed their cargo here from across the Adriatic.' },
        { big: '194', unit: 'cm', label: 'highest tide', text: 'At high tide, the acqua alta, the lagoon floods the lowest streets. The highest on record, 194 cm, came on 4 November 1966.' },
        { big: '2020', label: 'flood gates', text: 'Since 2020, gates on the seabed at the mouths of the lagoon can rise to hold back the highest tides.' },
      ] },
  ],
  // Buenos Aires: approved by Dan, 13 October 2026 (docs/BUENOS-AIRES-FACTS-DRAFT.md,
  // sources listed there).
  buenosaires: [
    { street: 'Caminito', tag: 'A street museum',
      facts: [
        { big: '1959', label: 'street museum', text: 'Caminito opened as an open-air street museum in 1959.' },
        { text: 'Its houses are conventillos, homes of wood and sheet metal built by immigrants, many from Genoa, in the late 1800s.' },
        { text: 'The painter Benito Quinquela Martín led the work to bring the lane back to life and cover it in colour.' },
      ] },
    { street: 'Avenida de Mayo', tag: 'The grand avenue',
      facts: [
        { big: '1894', label: 'opened', text: "Avenida de Mayo opened in 1894, running from the Plaza de Mayo, in front of the President's palace, to the Congress." },
        { big: '1858', label: 'Café Tortoni', text: 'Café Tortoni, on this avenue, has served coffee since 1858, and was among the first cafés in the city to put tables out on the pavement.' },
        { text: 'Its tall fronts, domes and balconies were built to look like the grand boulevards of Europe.' },
      ] },
    { street: 'Avenida 9 de Julio', tag: 'The wide avenue',
      facts: [
        { big: '140', unit: 'm', label: 'wide', text: 'The avenue is about 140 metres wide: it takes up a whole city block.' },
        { text: 'It is often called the widest avenue in the world.' },
        { big: '1937', label: 'building began', text: 'Work began in 1937, and the whole avenue was not finished until 1980.' },
      ] },
  ],
  // Approved by Dan, 6 September 2026 (docs/JERUSALEM-FACTS-DRAFT.md): facts
  // are architectural, historical and measurable; no claims about sovereignty.
  jerusalem: [
    { street: 'Jaffa Road', tag: 'The road to the sea',
      facts: [
        { big: '1860s', label: 'the first carriage road', text: 'Jaffa Road was cut in the 1860s as the first carriage road linking Jerusalem to the port of Jaffa, and pilgrims arriving by sea entered the city along it.' },
        { big: '2011', label: 'reopened for light rail', text: 'Once choked with traffic, the street was rebuilt as a pedestrian and light-rail spine, reopening in 2011.' },
        { text: 'It runs from Jaffa Gate in the Old City wall out to the modern city — the seam where old Jerusalem meets new.' },
      ] },
    { street: 'Mahane Yehuda', tag: 'The market',
      facts: [
        { big: '250', unit: 'stalls', label: 'traders', text: 'Around 250 traders sell spices, produce, halva and rugelach through the covered and open lanes.' },
        { big: '1887', label: 'formalised under Ottoman rule', text: 'The market grew informally in the 1880s as farmers sold outside the walls, and was formalised under Ottoman rule.' },
        { text: 'By day it is a market; after the shutters come down the same alleys become the city\'s bars and restaurants.' },
      ] },
    { street: 'The Cardo', tag: 'The Roman high street',
      facts: [
        { big: '6th', unit: 'century', label: 'Byzantine main street', text: 'The colonnaded Cardo was the main street of Byzantine Jerusalem, running north–south through the city.' },
        { big: '22', unit: 'm', label: 'wide', text: 'Wide enough for carts down the centre with covered colonnades either side for traders.' },
        { text: 'It appears on the Madaba Map — a 6th-century mosaic floor map in Jordan — which is how archaeologists knew where to dig for it.' },
      ] },
  ],
};

// scale: real height in metres, for the comparison graphic. Only where the
// height is worth showing; a monument without one shows its facts alone.
// compare: what to measure against: 'bus', 'person', 'liberty', or another
// monument with a scale and a silhouette in src/factviz.js. Pick a reference
// for a striking gap in height, or for a real link between the two; a link
// goes in `note`, one short line shown under the graphic. Two buildings of
// about the same height with nothing in common tell the player nothing.
export const MONUMENT_FACTS = {
  empire: { scale: 381, compare: 'liberty',
    facts: [
      { big: '410', unit: 'days', label: 'to build', text: 'Raised in just 410 days during the Great Depression, opening in 1931.' },
      { big: '381', unit: 'm', label: 'to the roof', text: 'At 102 storeys it was the tallest building in the world for nearly forty years.' },
      { big: '25', unit: 'strikes', label: 'of lightning a year', text: 'The tower is struck by lightning around 25 times every year.' },
    ] },
  chrysler: { scale: 319, compare: 'empire', note: 'The Empire State took its record in 1931.',
    facts: [
      { big: '90', unit: 'minutes', label: 'to raise the spire', text: 'The 56m spire was assembled in secret inside the building, then raised in 90 minutes to snatch the height record.' },
      { big: '1930', label: 'completed', text: 'Its stainless steel crown is arranged in radiating sunburst arches.' },
      { text: 'The eagle gargoyles were modelled on 1929 Chrysler car hood ornaments.' },
    ] },
  brooklyn: { scale: 84, compare: 'bus',
    facts: [
      { big: '1883', label: 'opened', text: 'When it opened it was the longest suspension bridge in the world.' },
      { big: '21', unit: 'elephants', label: 'proved it safe', text: 'In 1884 P.T. Barnum marched 21 elephants across to prove the bridge would hold.' },
      { text: 'It was the first suspension bridge anywhere to use steel wire cables.' },
    ] },
  eiffel: { scale: 330, compare: 'liberty', note: "Eiffel also built the Statue of Liberty's iron frame.",
    facts: [
      { big: '2.5M', unit: 'rivets', label: 'hold it together', text: 'Its 18,038 iron pieces are joined by two and a half million rivets.' },
      { big: '15', unit: 'cm', label: 'taller in summer', text: 'Heat expands the iron — the tower grows measurably on a hot day.' },
      { text: 'Built for the 1889 World\'s Fair, and meant to be dismantled after twenty years.' },
    ] },
  arc: { scale: 50, compare: 'bus',
    facts: [
      { big: '660', unit: 'names', label: 'engraved on it', text: 'The names of 660 of Napoleon\'s generals are carved into its walls.' },
      { big: '30', unit: 'years', label: 'to complete', text: 'Ordered in 1806, it was only finished in 1836 — long after Napoleon\'s death.' },
      { text: 'An eternal flame has burned at the Tomb of the Unknown Soldier here since 1923.' },
    ] },
  louvre: { scale: 21, compare: 'person',
    facts: [
      { big: '673', unit: 'panes', label: 'of glass', text: 'The pyramid has 673 glass panes — the rumour of 666 is a myth.' },
      { big: '#1', label: 'most visited museum', text: 'The Louvre receives more visitors than any other museum on earth.' },
      { text: 'I. M. Pei\'s pyramid opened in 1989 to fierce controversy, and is now beloved.' },
    ] },
  bigben: { scale: 96, compare: 'bus',
    facts: [
      { big: '13.7', unit: 'tonnes', label: 'the bell alone', text: '"Big Ben" is the bell, not the tower — the tower is the Elizabeth Tower.' },
      { big: '96', unit: 'm', label: 'tall', text: 'Completed in 1859, it leans very slightly — about a quarter of a degree.' },
      { text: 'The clock is fine-tuned by stacking old penny coins on its pendulum.' },
    ] },
  towerbridge: { scale: 65, compare: 'bus',
    facts: [
      { big: '800', unit: 'lifts', label: 'a year', text: 'The bascules still raise around 800 times a year to let ships pass.' },
      { big: '1894', label: 'opened', text: 'The original lifting machinery ran on steam-powered hydraulics.' },
      { text: 'Tourists routinely confuse it with London Bridge — the far plainer bridge next door.' },
    ] },
  eye: { scale: 135, compare: 'bigben', note: 'They face each other across the Thames.',
    facts: [
      { big: '32', unit: 'capsules', label: 'one per borough', text: 'Numbered 1 to 33 — there is no capsule 13.' },
      { big: '0.9', unit: 'km/h', label: 'rotation speed', text: 'It turns so slowly that it usually never stops for passengers to board.' },
      { text: 'At 135m it was the tallest observation wheel in the world when it opened in 2000.' },
    ] },
  colosseum: { scale: 48, compare: 'person',
    facts: [
      { big: '50k', unit: 'spectators', label: 'capacity', text: 'Completed in AD 80, it seated around fifty thousand people.' },
      { big: '80', unit: 'entrances', label: 'to clear the crowd', text: 'Eighty arched entrances let the whole arena empty in minutes.' },
      { text: 'A vast canvas awning, the velarium, could be rigged overhead to shade the crowd.' },
    ] },
  trevi: { scale: 26, compare: 'person',
    facts: [
      { big: '€1.5M', label: 'thrown in each year', text: 'Every coin is collected and given to charity.' },
      { big: '19', unit: 'BC', label: 'the aqueduct feeding it', text: 'The fountain still runs on the Aqua Virgo, built two thousand years ago.' },
      { text: 'One coin means you will return to Rome; two, romance; three, marriage.' },
    ] },
  pantheon: { scale: 43, compare: 'person',
    facts: [
      { big: '1,900', unit: 'years', label: 'in continuous use', text: 'Rebuilt by Hadrian around AD 126 and never abandoned since.' },
      { big: '43', unit: 'm', label: 'unreinforced dome', text: 'Still the largest unreinforced concrete dome ever built, anywhere.' },
      { text: 'Its only light is the 8.2m oculus — and the floor has drains for the rain.' },
    ] },
  ggbridge: { scale: 227, compare: 'bigben',
    facts: [
      { big: '227', unit: 'm', label: 'tower height', text: 'Each of its two towers rises 227 m above the water.' },
      { big: '1937', label: 'opened', text: 'When it opened in 1937 it was the longest suspension bridge in the world.' },
      { text: 'Painters work on it all year round to protect the steel from the salty sea air. The colour is called International Orange.' },
    ] },
  coit: { scale: 64, compare: 'bus',
    facts: [
      { big: '1933', label: 'completed', text: 'Coit Tower was finished in 1933, paid for with money left to the city by Lillie Hitchcock Coit.' },
      { big: '64', unit: 'm', label: 'tall', text: 'The tower is 64 m tall and stands on top of Telegraph Hill.' },
      { text: 'Inside, the walls are covered in murals painted by more than 25 artists in 1934.' },
    ] },
  paintedladies: { scale: 12, compare: 'person',
    facts: [
      { big: '1892', label: 'building began', text: 'The row was built between 1892 and 1896 by the builder Matthew Kavanagh.' },
      { big: '7', unit: 'houses', label: 'in the row', text: 'The famous row on Steiner Street has seven houses, sometimes called the Seven Sisters.' },
      { text: 'They got the name Painted Ladies from a 1978 book about brightly painted Victorian houses.' },
    ] },
  // Jerusalem (approved 6 September 2026). The Dome of the Rock alone has four
  // facts, so it can say it is not the al-Aqsa Mosque. Neither it nor the
  // Tower of David has a sourced height for the structure, so neither has the
  // height comparison.
  kotel: { scale: 19, compare: 'person',
    facts: [
      { big: '488', unit: 'm', label: 'total length', text: 'The Western Wall is the holiest place where Jews are permitted to pray, not the holiest site in Judaism — that is the Temple Mount above it. Only about 57 m of the wall is exposed at the prayer plaza; the rest runs on beneath later buildings.' },
      { big: '19', unit: 'BCE', label: "Herod's expansion", text: 'The wall is a retaining wall built to support the enlarged platform of the Second Temple, not a wall of the Temple itself.' },
      { big: '1M+', unit: 'notes', label: 'placed every year', text: 'Written prayers are placed in the cracks. They are collected twice a year and buried on the Mount of Olives, never thrown away.' },
    ] },
  domerock: {
    facts: [
      { big: '691', unit: 'CE', label: 'completed', text: 'One of the oldest surviving Islamic buildings in the world, built under Caliph Abd al-Malik.' },
      { big: '80', unit: 'kg', label: 'of gold', text: 'The dome was re-covered in 1993; King Hussein of Jordan funded the work, reportedly selling a house in London to pay for it.' },
      { big: '8', unit: 'sides', label: 'a perfect octagon', text: 'The plan is a perfect octagon around the rock at its centre, its exterior clad in Ottoman tilework added under Suleiman in the 1550s.' },
      { text: 'It is not the al-Aqsa Mosque. They are two separate buildings on the same compound — the compound itself stands on the Temple Mount (Jewish tradition) and Haram al-Sharif, "the Noble Sanctuary" (Islamic tradition). The Dome of the Rock is the gold-domed octagon; al-Aqsa is the silver-domed mosque to its south. The two are very widely confused.' },
    ] },
  // Approved by Dan, 27 September 2026 (docs/JERUSALEM-FACTS-DRAFT.md,
  // "Church of the Holy Sepulchre"). Architectural and historical, each
  // community described in its own terms. No height chart: not sourced.
  holysepulchre: {
    facts: [
      { big: '335', unit: 'CE', label: 'first church consecrated', text: 'The first church here was built on the orders of Emperor Constantine and consecrated in 335. Christians revere the site as the place of the crucifixion and burial of Jesus.' },
      { big: '6', unit: 'communities', label: 'share the church', text: 'Six Christian communities share the building — Greek Orthodox, Roman Catholic, Armenian, Coptic, Syriac and Ethiopian — under an arrangement called the Status Quo, set down by the Ottoman authorities in the 1750s and 1850s.' },
      { text: 'The wooden ladder on the ledge above the entrance has stood there since at least the 1700s, because moving it needs every community to agree. For centuries two Muslim families have kept the key and opened the great door each morning.' },
    ] },
  // New Orleans: approved by Dan, 17 October 2026 (docs/NEW-ORLEANS-FACTS-DRAFT.md).
  cabildo: {
    facts: [
      { big: '1799', label: 'completed', text: 'Built from 1795 to 1799, it was the seat of the Spanish colonial city government.' },
      { big: '1803', label: 'Louisiana Purchase', text: 'The ceremonies that handed Louisiana to the United States took place here in 1803.' },
      { big: '1847', label: 'the roof', text: 'Its Spanish arches are topped by a French mansard roof, added in 1847.' },
    ] },
  pontalba: {
    facts: [
      { big: '1851', label: 'completed', text: 'Baroness Micaela Almonester de Pontalba built the two matching red-brick rows from 1849 to 1851.' },
      { text: 'Her initials, AP, are worked into the cast-iron railings of the balconies.' },
      { text: 'They face each other across Jackson Square, with shops below and homes above.' },
    ] },
  stlouis: {
    facts: [
      { big: '1718', label: 'first church', text: 'The first church on this site was built in 1718.' },
      { big: '1850', label: 'rebuilt', text: 'The cathedral was largely rebuilt and completed in the 1850s.' },
      { text: 'It is among the oldest cathedrals in continuous use in the United States.' },
    ] },
  // Venice: approved by Dan, 15 October 2026 (docs/VENICE-FACTS-DRAFT.md).
  // No height graphics: none of the three has a height worth showing.
  rialto: {
    facts: [
      { big: '1591', label: 'completed', text: 'The stone bridge was built from 1588 to 1591, to a design by Antonio da Ponte.' },
      { text: 'It replaced a wooden bridge and kept its shape: one arch, with rows of shops along it.' },
      { text: 'It is the oldest of the four bridges across the Grand Canal.' },
    ] },
  salute: {
    facts: [
      { big: '1631', label: 'begun', text: 'Venice vowed to build it in 1630, in thanks for the end of a terrible plague. Work began in 1631.' },
      { big: '56', unit: 'years', label: 'to build', text: 'It was finished in 1687. Its architect, Baldassare Longhena, died five years before.' },
      { text: 'Every year on 21 November a bridge on floats is laid across the Grand Canal, so people can walk to it.' },
    ] },
  dogespalace: {
    facts: [
      { big: '1340', label: 'rebuilt', text: 'A palace stood here from the 800s. The building you see was begun in 1340 and added to over the next two centuries.' },
      { text: "It was the home of the Doge, Venice's ruler, and the seat of its government. It has been a museum since 1923." },
      { big: '1600', label: 'Bridge of Sighs', text: "The enclosed Bridge of Sighs, built around 1600, led from the palace's courtrooms to the prison. Lord Byron gave it its English name." },
    ] },
  // Buenos Aires: approved by Dan, 13 October 2026 (docs/BUENOS-AIRES-FACTS-DRAFT.md).
  casarosada: {
    facts: [
      { big: '1898', label: 'completed', text: 'The palace took its present form in 1898, when two older buildings were joined by a great archway.' },
      { text: 'It is the office of the President of Argentina.' },
      { text: 'Its balcony looks out over the Plaza de Mayo, the square at the heart of the city.' },
    ] },
  colon: {
    facts: [
      { big: '1908', label: 'opened', text: "The opera house opened on 25 May 1908, with Verdi's Aida." },
      { text: 'It took nearly twenty years to build, and three architects worked on it in turn.' },
      { text: 'Its sound is counted among the best of any opera house in the world.' },
    ] },
  // dome 80 m (en.wikipedia.org/wiki/Palace_of_the_Argentine_National_Congress)
  congreso: { scale: 80, compare: 'bigben', note: 'Both crown a parliament.',
    facts: [
      { big: '80', unit: 'm', label: 'to the dome', text: 'Its green copper dome rises 80 metres.' },
      { big: '1906', label: 'opened', text: 'The palace opened in 1906, although the work was not fully finished until 1946.' },
      { text: 'Its architect, Vittorio Meano, also worked on the Teatro Colón.' },
    ] },
  // Chicago: approved by Dan, 13 October 2026 (docs/CHICAGO-FACTS-DRAFT.md).
  // 154 ft, 47 m (en.wikipedia.org/wiki/Chicago_Water_Tower)
  watertower: { scale: 47, compare: 'willis', note: "Chicago's tallest building is over nine times taller.",
    facts: [
      { big: '1869', label: 'built', text: 'The Water Tower was finished in 1869 to hide a tall iron pipe that helped pump water to the city.' },
      { big: '1871', label: 'the Great Fire', text: 'It was the only public building in the burned area to survive the Great Chicago Fire of 1871.' },
      { big: '47', unit: 'm', label: 'tall', text: 'It stands 47 metres tall, built of yellow limestone.' },
    ] },
  // the centre jet reaches 150 ft, about 46 m (chicagoparkdistrict.com)
  buckingham: { scale: 46, compare: 'person',
    facts: [
      { big: '1927', label: 'opened', text: 'Buckingham Fountain opened in 1927, one of the largest fountains in the world.' },
      { big: '46', unit: 'm', label: 'the centre jet', text: 'In its big display, the centre jet shoots water 46 metres into the air.' },
      { text: 'The water show runs for 20 minutes every hour, from spring to autumn.' },
    ] },
  // 442 m to the roof (en.wikipedia.org/wiki/Willis_Tower)
  willis: { scale: 442, compare: 'empire', note: "Each was the world's tallest building in its day.",
    facts: [
      { big: '442', unit: 'm', label: 'tall', text: 'The tower rises 442 metres to its roof, more with its antennas.' },
      { big: '1973', label: 'opened', text: 'When it opened in 1973 it was the tallest building in the world, and it held that title for nearly 25 years.' },
      { text: 'It is built as nine square tubes bundled together. They stop at different heights, so the tower steps back as it rises.' },
    ] },
  // Istanbul: approved by Dan, 13 October 2026 (docs/ISTANBUL-FACTS-DRAFT.md).
  // 66.9 m to the tip of its cap (en.wikipedia.org/wiki/Galata_Tower)
  galata: { scale: 66.9, compare: 'person',
    facts: [
      { big: '67', unit: 'm', label: 'to the tip', text: 'The tower stands about 67 metres to the tip of its cap.' },
      { big: '1348', label: 'built', text: 'Genoese merchants built it in 1348, and called it the Tower of Christ.' },
      { text: 'A storm blew its cap off in 1875. The pointed cap was put back when the tower was restored in the 1960s.' },
    ] },
  bluemosque: {
    facts: [
      { big: '1616', label: 'completed', text: 'Built from 1609 to 1616 for Sultan Ahmed I, it is still a working mosque.' },
      { big: '6', unit: 'minarets', label: 'around it', text: 'It has six minarets, which was very unusual when it was built.' },
      { big: '20,000', unit: 'tiles', label: 'inside', text: 'More than 20,000 hand-painted tiles from İznik line its walls inside, many of them blue: that is how it got its nickname.' },
    ] },
  // 55 m to the top of the dome (en.wikipedia.org/wiki/Hagia_Sophia)
  hagiasophia: { scale: 55, compare: 'pantheon', note: 'Two great domes, four centuries apart.',
    facts: [
      { big: '537', label: 'completed', text: 'It was completed in 537, after less than six years of building.' },
      { big: '55', unit: 'm', label: 'to the dome', text: 'Its great dome rises about 55 metres above the floor.' },
      { text: 'Built as a cathedral, it became a mosque in 1453, a museum in 1934, and a mosque again in 2020.' },
    ] },
  // Havana: approved by Dan, 13 October 2026 (docs/HAVANA-FACTS-DRAFT.md).
  realfuerza: {
    facts: [
      { big: '1577', label: 'completed', text: 'Completed in 1577, it is one of the oldest stone forts in the Americas.' },
      { text: 'The bronze weathervane on its tower, La Giraldilla, was cast in the 1630s and has become a symbol of Havana.' },
      { text: 'The Giraldilla on the tower today is a copy; the original is kept safe inside.' },
    ] },
  habanacathedral: {
    facts: [
      { big: '1777', label: 'completed', text: 'Begun by the Jesuits in 1748, it was finished in 1777.' },
      { text: 'Its two bell towers are different widths, so that rainwater could drain from the square beside it.' },
      { big: '1789', label: 'made a cathedral', text: 'It became Havana\'s cathedral in 1789.' },
    ] },
  morro: {
    facts: [
      { big: '1589', label: 'begun', text: 'Work began in 1589, to a design by the Italian engineer Battista Antonelli.' },
      { text: 'In times of danger, an iron chain was stretched across the harbour mouth to the fort on the other side.' },
      { text: 'The lighthouse on its point was added in the 1800s, and still guides ships into the harbour.' },
    ] },
  // Beijing: approved by Dan, 13 October 2026 (docs/BEIJING-FACTS-DRAFT.md).
  // 46.7 m (en.wikipedia.org/wiki/Drum_Tower_and_Bell_Tower_of_Beijing)
  drumtower: { scale: 46.7, compare: 'bus',
    facts: [
      { big: '47', unit: 'm', label: 'tall', text: 'The Drum Tower stands about 47 metres tall.' },
      { big: '1272', label: 'first built', text: 'It was first built in 1272, and rebuilt on this spot in 1420.' },
      { text: 'Drums were beaten here to tell the city the time. It once held 25 drums; one great drum is left.' },
    ] },
  // 38 m (en.wikipedia.org/wiki/Temple_of_Heaven)
  qiniandian: { scale: 38, compare: 'person',
    facts: [
      { big: '38', unit: 'm', label: 'tall', text: 'The hall is round, built of wood, and 38 metres tall.' },
      { big: '1889', label: 'struck by lightning', text: 'First built in 1420, it burned after a lightning strike in 1889 and was rebuilt to the same design.' },
      { text: 'Emperors came here every year to pray for a good harvest.' },
    ] },
  // about 35 m with its marble terrace (en.wikipedia.org/wiki/Hall_of_Supreme_Harmony)
  taihedian: { scale: 35, compare: 'bus',
    facts: [
      { big: '35', unit: 'm', label: 'tall', text: 'With its marble terrace, the hall rises about 35 metres.' },
      { big: '1695', label: 'rebuilt', text: 'First built in the 1420s, the hall standing today was rebuilt in 1695.' },
      { text: 'It is one of the largest wooden buildings in China. Emperors held their grandest ceremonies here.' },
    ] },
  // Zanzibar: approved by Dan, 13 October 2026 (docs/ZANZIBAR-FACTS-DRAFT.md).
  oldfort: {
    facts: [
      { big: '1699', label: 'built by', text: 'The fort was built by about 1699, after Oman took the island from Portugal, on the site of a Portuguese church.' },
      { text: 'It has served as a garrison, a prison and a railway terminus.' },
      { text: "Today it is a cultural centre, and home to the Zanzibar International Film Festival." },
    ] },
  christchurch: {
    facts: [
      { big: '1873', label: 'slave market closed', text: 'The cathedral stands where the island\'s slave market was, closed in 1873. Its first stone was laid that Christmas.' },
      { text: 'Bishop Edward Steere, who campaigned against slavery, led the building, and designed its unusual barrel-vaulted roof.' },
      { text: 'Its altar is said to stand where the whipping post was, so that the place of suffering became a place of worship.' },
    ] },
  wonders: {
    facts: [
      { big: '1883', label: 'built', text: 'Sultan Barghash built it in 1883 as a palace for ceremonies.' },
      { text: 'It was the first building in Zanzibar with electricity, and the first in East Africa with a lift: that is how it got its name.' },
      { text: 'Part of it collapsed in 2020, and it is being restored.' },
    ] },
  // Samarkand: approved by Dan, 13 October 2026 (docs/SAMARKAND-FACTS-DRAFT.md).
  observatory: {
    facts: [
      { big: '1420', label: 'founded', text: "Ulugh Beg, Timur's grandson and an astronomer, built his observatory here around 1420." },
      { big: '40', unit: 'm', label: 'sextant radius', text: 'Its great sextant, a curved track of marble set into the hill, had a radius of about 40 metres.' },
      { big: '1908', label: 'found again', text: 'The observatory was lost for centuries, until an archaeologist found its remains in 1908.' },
    ] },
  gurlamir: {
    facts: [
      { big: '1404', label: 'completed', text: 'The mausoleum was begun in 1403 and finished in 1404. Timur himself was later buried here.' },
      { text: "Its name means 'tomb of the king' in Persian." },
      { big: '64', unit: 'ribs', label: 'on its dome', text: 'Its turquoise melon dome is shaped with 64 ribs.' },
    ] },
  registan: {
    facts: [
      { big: '1420', label: 'first madrasa', text: "Ulugh Beg's madrasa, on the left, was built from 1417 to 1420, with fifty rooms for its students." },
      { text: "Sher-Dor's gate shows two tigers with rising suns on their backs, rare in buildings of its kind for showing living creatures." },
      { big: '1660', label: 'Tilya-Kori finished', text: "Tilya-Kori, at the back, was built from 1646 to 1660. Its name means 'gilded'." },
    ] },
  // Seoul: approved by Dan, 13 October 2026 (docs/SEOUL-FACTS-DRAFT.md).
  heunginjimun: {
    facts: [
      { big: '1869', label: 'rebuilt', text: 'First built in 1398, the gate that stands today was rebuilt in 1869.' },
      { text: "It is the only one of Seoul's great city gates guarded by an ongseong, a half-ring of wall built out in front of it." },
      { big: '1962', label: 'Treasure No. 1', text: 'In 1962 South Korea listed it as Treasure No. 1.' },
    ] },
  gyeonghoeru: {
    facts: [
      { big: '48', unit: 'pillars', label: 'of stone', text: 'The pavilion stands on 48 stone pillars: square ones around the outside, round ones within.' },
      { big: '1867', label: 'rebuilt', text: 'First built in 1412, it burned in 1592, leaving only its stone base, and was rebuilt in 1867.' },
      { text: 'Kings held banquets here and welcomed foreign envoys, out on its island in the palace pond.' },
    ] },
  geunjeongjeon: {
    facts: [
      { big: '1867', label: 'rebuilt', text: 'The throne hall was first built in 1395, burned in 1592 and was rebuilt in 1867.' },
      { text: 'Stone animals, among them the twelve animals of the zodiac, guard the balustrades of its terraces.' },
      { text: 'Rows of stone markers in the courtyard showed each official where to stand, by rank.' },
    ] },
  // Hanoi: approved by Dan, 13 October 2026 (docs/HANOI-FACTS-DRAFT.md).
  turtletower: {
    facts: [
      { big: '1886', label: 'built', text: 'The little tower was built on its island in the lake in 1886.' },
      { text: "It is named for the golden turtle of the lake's legend." },
      { text: 'Visitors cannot go out to it: everyone sees it from the shore.' },
    ] },
  longbien: {
    facts: [
      { big: '1903', label: 'opened', text: 'Designed by the Paris firm Daydé & Pillé, it opened in 1903 as the first steel bridge across the Red River.' },
      { big: '2,290', unit: 'm', label: 'long', text: 'It is 2,290 metres long and crosses the river on 19 spans.' },
      { text: 'It was first named after Paul Doumer, the French governor-general, and was renamed Long Bien after 1954.' },
    ] },
  vanmieu: {
    facts: [
      { big: '1070', label: 'founded', text: "The temple was founded in 1070, and in 1076 Vietnam's first national university opened beside it." },
      { big: '82', unit: 'tablets', label: 'on stone turtles', text: 'Eighty-two stone tablets, each carried on the back of a stone turtle, record the scholars who passed the royal exams.' },
      { big: '1805', label: 'the pavilion', text: 'Its Constellation of Literature Pavilion was built in 1805, and it has become a symbol of Hanoi.' },
    ] },
  // Cape Town: approved by Dan, 13 October 2026 (docs/CAPE-TOWN-FACTS-DRAFT.md).
  clocktower: {
    facts: [
      { big: '1882', label: 'built', text: "Finished in 1882, the tower was the harbour's first Port Captain's office." },
      { text: 'Upstairs, mirrors let the Port Captain watch the whole harbour. Downstairs, a tide gauge showed ships how high the water was.' },
      { text: 'When it was restored in the 1990s, layers of grey paint were stripped off to find its original red.' },
    ] },
  goodhope: {
    facts: [
      { big: '1679', label: 'completed', text: 'Built between 1666 and 1679, it is the oldest colonial building in South Africa.' },
      { big: '5', unit: 'bastions', label: 'one at each point', text: "It is shaped like a five-pointed star, with a bastion at each point, named after the titles of the Dutch Prince of Orange." },
      { text: 'It replaced an earlier square fort built in 1652 by Jan van Riebeeck, who founded the settlement.' },
    ] },
  cityhall: {
    facts: [
      { big: '1905', label: 'opened', text: 'Its cornerstone was laid in 1900, and the hall opened in 1905.' },
      { big: '39', unit: 'bells', label: 'in its tower', text: 'Its clock tower holds a carillon of 39 bells, one of the largest in South Africa.' },
      { text: 'On 11 February 1990, Nelson Mandela gave his first speech after his release from prison from its balcony.' },
    ] },
  // Bangkok: approved by Dan, 13 October 2026 (docs/BANGKOK-FACTS-DRAFT.md).
  // 21.15 m (en.wikipedia.org/wiki/Giant_Swing)
  giantswing: { scale: 21.15, compare: 'person',
    facts: [
      { big: '21', unit: 'm', label: 'tall', text: 'The Giant Swing stands 21 metres tall, in front of the Devasathan shrine.' },
      { big: '1784', label: 'first built', text: 'It was first built in 1784. Its great teak pillars were replaced, to the same design, in 2007.' },
      { text: 'A swinging ceremony was once held here every year. It stopped in 1935.' },
    ] },
  // 82 m for the central prang: the figure Dan chose; sources give 66.8 to
  // 86 m (en.wikipedia.org/wiki/Wat_Arun).
  watarun: { scale: 82, compare: 'bus',
    facts: [
      { big: '82', unit: 'm', label: 'the central spire', text: 'Its central tower, the prang, rises about 82 metres.' },
      { big: '1851', label: 'completed', text: 'The central prang was finished in 1851, after building began under King Rama II and went on under King Rama III.' },
      { text: 'Its tiers are covered in broken porcelain and seashells. Some of the china came to Bangkok as ballast in ships from China.' },
    ] },
  chakri: {
    facts: [
      { big: '1882', label: 'completed', text: 'The throne hall was finished in 1882, a hundred years after the Grand Palace was founded.' },
      { text: 'Its body is built in a European style, but its three roofs are traditional Thai, each crowned with a tall spire.' },
      { big: '1782', label: 'palace founded', text: 'The Grand Palace was begun in 1782, the year Bangkok became the capital.' },
    ] },
  // Delhi: approved by Dan, 13 October 2026 (docs/DELHI-FACTS-DRAFT.md).
  lahori: {
    facts: [
      { big: '1648', label: 'completed', text: "Emperor Shah Jahan's fort took about nine years to build, from 1639 to 1648." },
      { big: '2.4', unit: 'km', label: 'of walls', text: 'Its red sandstone walls run for about 2.4 kilometres, and give the Red Fort its name.' },
      { text: 'The main entrance, the Lahori Gate, is named after the city of Lahore, which it faces.' },
    ] },
  // 72.5 m (en.wikipedia.org/wiki/Qutb_Minar)
  qutub: { scale: 72.5, compare: 'koutoubia', note: 'Two great minarets of the 1190s.',
    facts: [
      { big: '72.5', unit: 'm', label: 'tall', text: 'At 72.5 metres, it is the tallest minaret in the world built of brick.' },
      { big: '1199', label: 'begun', text: 'Qutb ud-Din Aibak began the tower in 1199, and his successor Iltutmish added three more storeys.' },
      { text: 'It narrows from 14.3 metres across at the base to just 2.7 metres at the top.' },
    ] },
  // 42 m (britannica.com/topic/India-Gate)
  indiagate: { scale: 42, compare: 'arc', note: 'Both are memorial arches for soldiers.',
    facts: [
      { big: '42', unit: 'm', label: 'tall', text: 'India Gate stands 42 metres high at the eastern end of Kartavya Path.' },
      { big: '1931', label: 'unveiled', text: 'Designed by the architect Edwin Lutyens, it was begun in 1921 and unveiled in 1931.' },
      { text: 'It is a war memorial: the names of more than 13,000 soldiers of the Indian Army who died are carved into its stone.' },
    ] },
  // Marrakech: approved by Dan, 13 October 2026 (docs/MARRAKECH-FACTS-DRAFT.md).
  // 77 m including the spire (en.wikipedia.org/wiki/Kutubiyya_Mosque).
  koutoubia: { scale: 77, compare: 'bus',
    facts: [
      { big: '77', unit: 'm', label: 'tall, with its spire', text: 'The minaret rises 77 metres, spire and all, and can be seen from almost anywhere in the old city.' },
      { big: '1195', label: 'finished around', text: 'It was completed around 1195 under Caliph Yaqub al-Mansur, and it has stood almost unchanged ever since.' },
      { text: "Its name means the booksellers' mosque: booksellers once kept their stalls all around it." },
    ] },
  babagnaou: {
    facts: [
      { big: '1188', label: 'built around', text: "Caliph Yaqub al-Mansur built the gate around 1188 as the grand entrance to his royal kasbah." },
      { text: "Most of the city's gates are rammed red earth, but Bab Agnaou is cut stone, carved with an inscription and flowers around its horseshoe arch." },
      { text: 'It once had two towers and a covered passage behind it. Those are gone, and the carved front is what still stands.' },
    ] },
  benyoussef: {
    facts: [
      { big: '1565', label: 'rebuilt', text: 'Sultan Abdallah al-Ghalib rebuilt the school in 1564 and 1565, on the site of a 14th-century one.' },
      { big: '130', unit: 'rooms', label: 'for students', text: 'Its 130 small rooms housed up to 800 students, making it the largest madrasa in Morocco.' },
      { text: 'It closed as a school in 1960 and opened to visitors in 1982. Its courtyard is covered in carved cedar, carved plaster and coloured tile.' },
    ] },
  // Mexico City: approved by Dan, 27 September 2026 (docs/cities/mexico-city.md §3).
  templomayor: { scale: 45, compare: 'person',
    facts: [
      { big: '1325', label: 'construction began', text: 'Building started here soon after 1325, when the Mexica people founded their city on an island in a lake.' },
      { big: '7', unit: 'layers', label: 'built again and again', text: 'Each ruler expanded the temple by building a new layer over the old one — archaeologists found seven layers stacked inside.' },
      { text: 'It was rediscovered by accident in 1978, when electrical workers dug up a huge carved stone disc nearby.' },
    ] },
  catedral: { scale: 67, compare: 'templomayor', note: 'It stands beside the ruins of the Templo Mayor.',
    facts: [
      { big: '250', unit: 'years', label: 'to build', text: 'Building went on for two and a half centuries, from 1573 to 1813, so it mixes styles from early Baroque to Neoclassical.' },
      { big: '25', unit: 'bells', label: 'in its towers', text: 'Twenty-five bells hang in the twin towers — the biggest alone weighs about as much as two elephants.' },
      { text: 'The cathedral is slowly sinking into the soft old lakebed it stands on, and engineers have spent decades working to straighten it.' },
    ] },
  // altitude: 2,325 m above sea level (chapultepeccastletours.com/facts,
  // checked 27 Sept 2026). No sourced height for the building itself.
  castillo: { altitude: 2325,
    facts: [
      { big: '1785', label: 'building began', text: 'Construction started in 1785, on a hill where Aztec rulers once had a retreat.' },
      { big: '1847', label: 'the cadets who defended it', text: 'During a battle here in 1847, a group of young military cadets are remembered in Mexico as the Niños Héroes for standing their ground.' },
      { text: 'It later became home to Mexican presidents, and today it holds the National History Museum.' },
    ] },
  // Not on a street at the moment (the Holy Sepulchre is the Cardo's
  // monument); kept for a fourth Jerusalem street.
  // altitude: the Tower of David Museum's own figure for the top of the
  // Phasael Tower, 777 m above sea level (tod.org.il/en/event/jerusalem360,
  // checked 26 Sept 2026). Shown in place of a height, which is not sourced.
  towerdavid: { altitude: 777,
    facts: [
      { big: '1655', label: 'the minaret', text: 'The tower everyone photographs is an Ottoman minaret, added more than 2,500 years after David.' },
      { big: '2nd', unit: 'c. BCE', label: 'Hasmonean foundations', text: "The citadel's foundations are Hasmonean — a Jewish ruling dynasty in Judea at that time — and were later rebuilt by Herod, Crusaders, Mamluks and Ottomans in turn." },
      { text: 'The name is a misnomer: Byzantine visitors assumed the citadel was King David\'s palace, and it stuck.' },
    ] },
};
