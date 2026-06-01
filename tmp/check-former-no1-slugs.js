const fetch = globalThis.fetch || require('node-fetch');
const slugs = [
  'ilie-nastase',
  'jimmy-connors',
  'bjorn-borg',
  'john-mcenroe',
  'ivan-lendl',
  'boris-becker',
  'stefan-edberg',
  'mats-wilander',
  'pete-sampras',
  'jim-courier',
  'andre-agassi',
  'patrick-rafter',
  'marat-safin',
  'yevgeny-kafelnikov',
  'lleyton-hewitt',
  'roger-federer',
  'andy-roddick',
  'thomas-muster',
  'andy-murray',
  'rafael-nadal',
  'novak-djokovic',
  'carlos-alcaraz',
  'daniil-medvedev',
  'alexander-zverev',
  'carlos-moya',
  'juan-carlos-ferrero'
];

(async () => {
  for (const slug of slugs) {
    try {
      const url = `https://stats.tennismylife.org/players/${slug}`;
      const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      console.log(slug, res.status);
    } catch (err) {
      console.error(slug, 'ERR', err.message);
    }
  }
})();
