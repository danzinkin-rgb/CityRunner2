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
};

// scale: real height in metres, for the comparison graphic.
// compare: a familiar object to measure against.
export const MONUMENT_FACTS = {
  empire: { scale: 381, compare: 'bus',
    facts: [
      { big: '410', unit: 'days', label: 'to build', text: 'Raised in just 410 days during the Great Depression, opening in 1931.' },
      { big: '381', unit: 'm', label: 'to the roof', text: 'At 102 storeys it was the tallest building in the world for nearly forty years.' },
      { big: '25', unit: 'strikes', label: 'of lightning a year', text: 'The tower is struck by lightning around 25 times every year.' },
    ] },
  chrysler: { scale: 319, compare: 'bus',
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
  eiffel: { scale: 330, compare: 'bus',
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
  eye: { scale: 135, compare: 'bus',
    facts: [
      { big: '32', unit: 'capsules', label: 'one per borough', text: 'Numbered 1 to 33 — there is no capsule 13.' },
      { big: '0.9', unit: 'km/h', label: 'rotation speed', text: 'It turns so slowly that it usually never stops for passengers to board.' },
      { text: 'At 135m it was the tallest observation wheel in the world when it opened in 2000.' },
    ] },
  colosseum: { scale: 48, compare: 'bus',
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
  pantheon: { scale: 43, compare: 'bus',
    facts: [
      { big: '1,900', unit: 'years', label: 'in continuous use', text: 'Rebuilt by Hadrian around AD 126 and never abandoned since.' },
      { big: '43', unit: 'm', label: 'unreinforced dome', text: 'Still the largest unreinforced concrete dome ever built, anywhere.' },
      { text: 'Its only light is the 8.2m oculus — and the floor has drains for the rain.' },
    ] },
};
