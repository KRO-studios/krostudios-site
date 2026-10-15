/* Actual KRO Studios apps and owned store artwork; no invented app screens. */
(() => {
  'use strict';
  const apps = {
    kino: {
      title:'SovietKino', category:'Russian cinema', status:'Android + iOS',
      short:'Classic cinema. One word at a time.',
      url:'https://krostudios.com/sovietkino/', icon:'assets/kino-icon.png', color:'#dbab70', form:'kino',
      shots:['assets/kinoHome.jpg','assets/kinoFeedback.jpg']
    },
    echo: {
      title:'Echo Dare', category:'Reverse-voice party game', status:'Coming soon · 18+',
      short:'Say it. Flip it. Lose it.',
      url:'https://krostudios.com/echodare.html', icon:'assets/echo-icon.png', color:'#ef9fc0', form:'echo',
      shots:['assets/echoHome.jpg','assets/echoListen.jpg']
    },
    tanakh: {
      title:'Tanakh Quiz', category:'Hebrew word puzzles', status:'Android + iOS',
      short:'Stories rediscovered, letter by letter.',
      url:'https://krostudios.com/tanakh-quiz/', icon:'assets/tanakh-icon.png', color:'#d9c790', form:'tanakh',
      shots:['assets/tanakhHome.jpg','assets/tanakhRank.jpg']
    },
    'half-life': {
      title:'Half Life Monsters', category:'Unofficial fan trivia', status:'Android',
      short:'Creatures, clues and a little Black Mesa nostalgia.',
      url:'https://play.google.com/store/apps/details?id=com.halflife.halflifequizvalvetrivia',
      icon:'assets/half-life-icon.webp', color:'#d6b969', form:'half-life',
      shots:['assets/half-life-1.webp','assets/half-life-2.webp']
    },
    dune: {
      title:'Dune 2 Tanks', category:'Retro strategy trivia', status:'Android',
      short:'A tribute to the machines of a strategy classic.',
      url:'https://play.google.com/store/apps/details?id=com.dunetanks.dunetanks',
      icon:'assets/dune-icon.webp', color:'#d59b61', form:'dune',
      shots:['assets/dune-1.webp','assets/dune-2.webp']
    },
    rap: {
      title:'Rap Quiz', category:'Rapper image quiz', status:'Android',
      short:'Faces, clues and hip-hop knowledge.',
      url:'https://play.google.com/store/apps/details?id=com.hiphoprap.guessrapperhiphop',
      icon:'assets/rap-icon.webp', color:'#d6a0c1', form:'rap',
      shots:['assets/rap-1.webp','assets/rap-2.webp']
    },
    beer: {
      title:'Guess The Beer', category:'Beer logo quiz', status:'Android',
      short:'Labels, brands and a different kind of quiz night.',
      url:'https://play.google.com/store/apps/details?id=com.beer.beergameguessthebeer',
      icon:'assets/beer-icon.webp', color:'#e0bd76', form:'beer',
      shots:['assets/beer-1.webp','assets/beer-2.webp']
    },
    feed: {
      title:'Накорми Кирюшу', englishTitle:'Feed Kiryusha', category:'Russian arcade', status:'Android',
      short:'Collect the sweets. Dodge the peppers.',
      url:'https://play.google.com/store/apps/details?id=com.krostudios.feedkirusha',
      icon:'assets/feed-icon.webp', color:'#eeb2bb', form:'feed',
      shots:['assets/feed-1.webp','assets/feed-2.webp']
    }
  };
  const order = ['kino','echo','tanakh','half-life','dune','rap','beer','feed'];
  for (const key of order) {
    apps[key].fallbacks = apps[key].shots.map((_,index) => 'assets/phone-'+key+'-'+index+'.webp');
    Object.freeze(apps[key].shots); Object.freeze(apps[key].fallbacks); Object.freeze(apps[key]);
  }
  window.KROCatalog = Object.freeze({order:Object.freeze(order),apps:Object.freeze(apps),featuredOrder:Object.freeze(['kino','echo','tanakh'])});
})();
