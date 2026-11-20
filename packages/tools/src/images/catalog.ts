/**
 * Catalogue des illustrations de War Board.
 *
 * Chaque entrée désigne un sujet par le titre de son article sur Wikipédia en
 * français. L'outil `pnpm images:build` retrouve l'élément Wikidata
 * correspondant, prend son image (P18) ou son drapeau en 1936 (P41), puis lit
 * sur Wikimedia Commons l'auteur et la licence du fichier.
 *
 * Pour corriger un résultat, ajouter à l'entrée :
 *  - `qid` pour forcer l'élément Wikidata (« Q312533 ») ;
 *  - `file` pour forcer le fichier Commons (« Maurice Gamelin 1936.jpg »).
 *
 * Pour agrandir la bibliothèque, il suffit d'ajouter des lignes ici.
 */

export type ImageKind = "flag" | "leader" | "general" | "admiral" | "ship" | "equipment" | "city" | "event";

export interface CatalogEntry {
  /** Identifiant stable utilisé par le jeu : « general:gamelin ». */
  id: string;
  kind: ImageKind;
  /** Nom affiché en français. */
  label: string;
  /** Titre de l'article Wikipédia en français. */
  frwiki: string;
  qid?: string;
  file?: string;
  /** Nation concernée (code de la simulation), si utile. */
  nation?: string;
  /**
   * L'image contient des symboles nazis : le client l'affiche légèrement floutée
   * (choix de design de War Board).
   */
  sensitive?: boolean;
}

type Row = [slug: string, label: string, frwiki: string, nation?: string, extra?: Partial<CatalogEntry>];
const rows = (kind: ImageKind, list: Row[]): CatalogEntry[] =>
  list.map(([slug, label, frwiki, nation, extra]) => ({ id: `${kind}:${slug}`, kind, label, frwiki, ...(nation ? { nation } : {}), ...extra }));

/** Drapeaux en usage le 1er janvier 1936, un par nation de la simulation. */
const FLAGS = rows("flag", [
  ["GER", "Allemagne", "Troisième Reich", "GER", { sensitive: true }],
  ["FRA", "France", "Troisième République (France)", "FRA"],
  ["GBR", "Royaume-Uni", "Royaume-Uni", "GBR"],
  ["ITA", "Italie", "Royaume d'Italie (1861-1946)", "ITA"],
  ["SOV", "URSS", "Union des républiques socialistes soviétiques", "SOV"],
  ["USA", "États-Unis", "États-Unis", "USA"],
  ["JAP", "Japon", "Empire du Japon", "JAP"],
  ["CHI", "Chine", "République de Chine (1912-1949)", "CHI", { file: "Flag of the Republic of China.svg" }],
  ["POL", "Pologne", "Deuxième République de Pologne", "POL"],
  ["ESP", "Espagne", "Seconde République espagnole", "ESP"],
  ["TUR", "Turquie", "Turquie", "TUR"],
  ["POR", "Portugal", "Estado Novo (Portugal)", "POR"],
  ["IRL", "Irlande", "État libre d'Irlande", "IRL"],
  ["BEL", "Belgique", "Belgique", "BEL"],
  ["NED", "Pays-Bas", "Pays-Bas", "NED"],
  ["LUX", "Luxembourg", "Luxembourg (pays)", "LUX"],
  ["SUI", "Suisse", "Suisse", "SUI"],
  ["AUT", "Autriche", "État fédéral d'Autriche", "AUT"],
  ["CZE", "Tchécoslovaquie", "Tchécoslovaquie", "CZE"],
  ["HUN", "Hongrie", "Royaume de Hongrie (1920-1946)", "HUN"],
  ["ROM", "Roumanie", "Royaume de Roumanie", "ROM"],
  ["YUG", "Yougoslavie", "Royaume de Yougoslavie", "YUG"],
  ["BUL", "Bulgarie", "Royaume de Bulgarie", "BUL"],
  ["GRE", "Grèce", "Royaume de Grèce", "GRE"],
  ["ALB", "Albanie", "Royaume albanais (1928-1939)", "ALB"],
  ["DEN", "Danemark", "Danemark", "DEN"],
  ["NOR", "Norvège", "Norvège", "NOR"],
  ["SWE", "Suède", "Suède", "SWE"],
  ["FIN", "Finlande", "Finlande", "FIN"],
  ["ISL", "Islande", "Royaume d'Islande", "ISL"],
  ["EST", "Estonie", "Estonie", "EST"],
  ["LAT", "Lettonie", "Lettonie", "LAT"],
  ["LIT", "Lituanie", "Lituanie", "LIT"],
  ["DAN", "Ville libre de Dantzig", "Ville libre de Dantzig", "DAN"],
  ["EGY", "Égypte", "Royaume d'Égypte", "EGY"],
  ["IRQ", "Irak", "Royaume d'Irak", "IRQ"],
  ["IRN", "Iran", "État impérial d'Iran", "IRN"],
  ["SAU", "Arabie saoudite", "Arabie saoudite", "SAU"],
  ["YEM", "Yémen", "Royaume mutawakkilite du Yémen", "YEM"],
  ["AFG", "Afghanistan", "Royaume d'Afghanistan", "AFG"],
  ["ETH", "Éthiopie", "Empire d'Éthiopie", "ETH"],
  ["LIB", "Liberia", "Liberia", "LIB"],
  ["SAF", "Afrique du Sud", "Union d'Afrique du Sud", "SAF"],
  ["CAN", "Canada", "Canada", "CAN"],
  ["MEX", "Mexique", "Mexique", "MEX"],
  ["GUA", "Guatemala", "Guatemala", "GUA"],
  ["HON", "Honduras", "Honduras", "HON"],
  ["ELS", "Salvador", "Salvador", "ELS"],
  ["NIC", "Nicaragua", "Nicaragua", "NIC"],
  ["COS", "Costa Rica", "Costa Rica", "COS"],
  ["PAN", "Panama", "Panama", "PAN"],
  ["CUB", "Cuba", "Cuba", "CUB"],
  ["HAI", "Haïti", "Haïti", "HAI"],
  ["DOM", "République dominicaine", "République dominicaine", "DOM"],
  ["COL", "Colombie", "Colombie", "COL"],
  ["VEN", "Venezuela", "Venezuela", "VEN"],
  ["ECU", "Équateur", "Équateur (pays)", "ECU"],
  ["PER", "Pérou", "Pérou", "PER"],
  ["BOL", "Bolivie", "Bolivie", "BOL"],
  ["CHL", "Chili", "Chili", "CHL"],
  ["ARG", "Argentine", "Argentine", "ARG"],
  ["URU", "Uruguay", "Uruguay", "URU"],
  ["PAR", "Paraguay", "Paraguay", "PAR"],
  ["BRA", "Brésil", "Brésil", "BRA"],
  ["MON", "Mongolie", "République populaire mongole", "MON"],
  ["TAN", "Touva", "République populaire de Touva", "TAN"],
  ["MAN", "Mandchoukouo", "Mandchoukouo", "MAN"],
  ["TIB", "Tibet", "Tibet (1912-1951)", "TIB"],
  ["SIK", "Xinjiang", "Xinjiang", "SIK", { file: "Flag of Xinjiang-Shicai.svg" }],
  ["SIA", "Siam", "Thaïlande", "SIA"],
  ["NEP", "Népal", "Royaume du Népal", "NEP"],
  ["BHU", "Bhoutan", "Bhoutan", "BHU"],
  ["AST", "Australie", "Australie", "AST"],
  ["NZL", "Nouvelle-Zélande", "Nouvelle-Zélande", "NZL"],
]);

/**
 * Chefs de gouvernement ou d'État, et grandes figures politiques. Pour chaque
 * nation, le premier de la liste est celui en place le 1er janvier 1936.
 */
const LEADERS = rows("leader", [
  ["laval", "Pierre Laval", "Pierre Laval", "FRA"],
  ["sarraut", "Albert Sarraut", "Albert Sarraut", "FRA"],
  ["blum", "Léon Blum", "Léon Blum", "FRA"],
  ["daladier", "Édouard Daladier", "Édouard Daladier", "FRA"],
  ["reynaud", "Paul Reynaud", "Paul Reynaud", "FRA"],
  ["petain", "Philippe Pétain", "Philippe Pétain", "FRA"],
  ["de-gaulle", "Charles de Gaulle", "Charles de Gaulle", "FRA"],
  ["hitler", "Adolf Hitler", "Adolf Hitler", "GER", { sensitive: true }],
  ["baldwin", "Stanley Baldwin", "Stanley Baldwin", "GBR"],
  ["chamberlain", "Neville Chamberlain", "Neville Chamberlain", "GBR"],
  ["churchill", "Winston Churchill", "Winston Churchill", "GBR"],
  ["mussolini", "Benito Mussolini", "Benito Mussolini", "ITA"],
  ["staline", "Joseph Staline", "Joseph Staline", "SOV"],
  ["roosevelt", "Franklin D. Roosevelt", "Franklin Delano Roosevelt", "USA"],
  ["hirohito", "Hirohito", "Hirohito", "JAP"],
  ["tchang", "Tchang Kaï-chek", "Tchang Kaï-chek", "CHI"],
  ["moscicki", "Ignacy Mościcki", "Ignacy Mościcki", "POL"],
  ["portela", "Manuel Portela Valladares", "Manuel Portela Valladares", "ESP"],
  ["azana", "Manuel Azaña", "Manuel Azaña", "ESP"],
  ["largo-caballero", "Francisco Largo Caballero", "Francisco Largo Caballero", "ESP"],
  ["franco", "Francisco Franco", "Francisco Franco", "ESP"],
  ["ataturk", "Mustafa Kemal Atatürk", "Mustafa Kemal Atatürk", "TUR"],
  ["salazar", "António de Oliveira Salazar", "António de Oliveira Salazar", "POR"],
  ["schuschnigg", "Kurt Schuschnigg", "Kurt Schuschnigg", "AUT"],
  ["benes", "Edvard Beneš", "Edvard Beneš", "CZE"],
  ["horthy", "Miklós Horthy", "Miklós Horthy", "HUN"],
  ["haile-selassie", "Haïlé Sélassié Ier", "Haïlé Sélassié Ier", "ETH"],
  ["leopold-iii", "Léopold III", "Léopold III (roi des Belges)", "BEL"],
]);

const GENERALS = rows("general", [
  // France
  ["gamelin", "Maurice Gamelin", "Maurice Gamelin", "FRA"],
  ["georges", "Alphonse Georges", "Alphonse Georges", "FRA"],
  ["huntziger", "Charles Huntziger", "Charles Huntziger", "FRA"],
  ["giraud", "Henri Giraud", "Henri Giraud", "FRA", { file: "Henri Giraud 1943Jan19.gif" }],
  ["weygand", "Maxime Weygand", "Maxime Weygand", "FRA"],
  ["billotte", "Gaston Billotte", "Gaston Billotte", "FRA"],
  ["corap", "André Corap", "André Corap", "FRA"],
  ["de-lattre", "Jean de Lattre de Tassigny", "Jean de Lattre de Tassigny", "FRA"],
  ["juin", "Alphonse Juin", "Alphonse Juin", "FRA"],
  ["leclerc", "Philippe Leclerc de Hauteclocque", "Philippe Leclerc de Hauteclocque", "FRA"],
  ["vuillemin", "Joseph Vuillemin", "Joseph Vuillemin", "FRA"],
  // Allemagne
  ["blomberg", "Werner von Blomberg", "Werner von Blomberg", "GER"],
  ["fritsch", "Werner von Fritsch", "Werner von Fritsch", "GER"],
  ["beck", "Ludwig Beck", "Ludwig Beck", "GER"],
  ["brauchitsch", "Walther von Brauchitsch", "Walther von Brauchitsch", "GER"],
  ["rundstedt", "Gerd von Rundstedt", "Gerd von Rundstedt", "GER"],
  ["bock", "Fedor von Bock", "Fedor von Bock", "GER"],
  ["manstein", "Erich von Manstein", "Erich von Manstein", "GER"],
  ["guderian", "Heinz Guderian", "Heinz Guderian", "GER"],
  ["rommel", "Erwin Rommel", "Erwin Rommel", "GER"],
  ["kesselring", "Albert Kesselring", "Albert Kesselring", "GER"],
  ["goring", "Hermann Göring", "Hermann Göring", "GER", { sensitive: true }],
  // Royaume-Uni
  ["gort", "Lord Gort", "John Vereker", "GBR"],
  ["montgomery", "Bernard Montgomery", "Bernard Montgomery", "GBR"],
  ["wavell", "Archibald Wavell", "Archibald Wavell", "GBR"],
  ["alanbrooke", "Alan Brooke", "Alan Brooke", "GBR"],
  ["alexander", "Harold Alexander", "Harold Alexander", "GBR"],
  ["dowding", "Hugh Dowding", "Hugh Dowding", "GBR"],
  // URSS
  ["vorochilov", "Kliment Vorochilov", "Kliment Vorochilov", "SOV"],
  ["toukhatchevski", "Mikhaïl Toukhatchevski", "Mikhaïl Toukhatchevski", "SOV"],
  ["joukov", "Gueorgui Joukov", "Gueorgui Joukov", "SOV"],
  ["timochenko", "Semion Timochenko", "Semion Timochenko", "SOV"],
  ["chapochnikov", "Boris Chapochnikov", "Boris Chapochnikov", "SOV"],
  ["rokossovski", "Constantin Rokossovski", "Constantin Rokossovski", "SOV"],
  ["koniev", "Ivan Koniev", "Ivan Koniev", "SOV"],
  // Italie
  ["badoglio", "Pietro Badoglio", "Pietro Badoglio", "ITA"],
  ["graziani", "Rodolfo Graziani", "Rodolfo Graziani", "ITA"],
  ["balbo", "Italo Balbo", "Italo Balbo", "ITA"],
  ["roatta", "Mario Roatta", "Mario Roatta", "ITA"],
  ["cavallero", "Ugo Cavallero", "Ugo Cavallero", "ITA"],
  // États-Unis
  ["macarthur", "Douglas MacArthur", "Douglas MacArthur", "USA"],
  ["marshall", "George Marshall", "George Marshall", "USA", { file: "General George C. Marshall, official military photo, 1946.JPEG" }],
  ["eisenhower", "Dwight D. Eisenhower", "Dwight D. Eisenhower", "USA"],
  ["patton", "George S. Patton", "George S. Patton", "USA"],
  ["bradley", "Omar Bradley", "Omar Bradley", "USA"],
  // Japon
  ["tojo", "Hideki Tōjō", "Hideki Tōjō", "JAP"],
  ["yamashita", "Tomoyuki Yamashita", "Tomoyuki Yamashita", "JAP"],
  // Espagne
  ["miaja", "José Miaja", "José Miaja", "ESP"],
  ["rojo", "Vicente Rojo", "Vicente Rojo Lluch", "ESP"],
  ["mola", "Emilio Mola", "Emilio Mola", "ESP"],
  // Pologne, Finlande
  ["rydz-smigly", "Edward Rydz-Śmigły", "Edward Rydz-Śmigły", "POL"],
  ["sikorski", "Władysław Sikorski", "Władysław Sikorski", "POL"],
  ["mannerheim", "Carl Gustaf Emil Mannerheim", "Carl Gustaf Emil Mannerheim", "FIN"],
]);

const ADMIRALS = rows("admiral", [
  ["darlan", "François Darlan", "François Darlan", "FRA"],
  ["esteva", "Jean-Pierre Esteva", "Jean-Pierre Esteva", "FRA"],
  ["gensoul", "Marcel Gensoul", "Marcel Gensoul", "FRA"],
  ["raeder", "Erich Raeder", "Erich Raeder", "GER"],
  ["donitz", "Karl Dönitz", "Karl Dönitz", "GER"],
  ["pound", "Dudley Pound", "Dudley Pound", "GBR"],
  ["cunningham", "Andrew Cunningham", "Andrew Cunningham", "GBR"],
  ["kouznetsov", "Nikolaï Kouznetsov", "Nikolaï Guerassimovitch Kouznetsov", "SOV"],
  ["cavagnari", "Domenico Cavagnari", "Domenico Cavagnari", "ITA"],
  ["nimitz", "Chester Nimitz", "Chester Nimitz", "USA"],
  ["king", "Ernest King", "Ernest King", "USA", { file: "Fleet Admiral Ernest J King-1945.jpg" }],
  ["halsey", "William Halsey", "William Halsey", "USA"],
  ["yamamoto", "Isoroku Yamamoto", "Isoroku Yamamoto", "JAP"],
]);

const SHIPS = rows("ship", [
  // Types (fiches génériques)
  ["type-cuirasse", "Cuirassé", "Cuirassé"],
  ["type-croiseur", "Croiseur", "Croiseur"],
  ["type-destroyer", "Destroyer", "Destroyer"],
  ["type-sous-marin", "Sous-marin", "Sous-marin"],
  ["type-porte-avions", "Porte-avions", "Porte-avions"],
  ["type-transport", "Navire de transport de troupes", "Transport de troupes"],
  // France
  ["richelieu", "Richelieu", "Richelieu (cuirassé)", "FRA", { file: "French battleship Richelieu in New York.jpg" }],
  ["jean-bart", "Jean Bart", "Jean Bart (cuirassé)", "FRA", { file: "French battleship Jean Bart in the Suez Canal.jpg" }],
  ["dunkerque", "Dunkerque", "Dunkerque (cuirassé)", "FRA", { file: "Dunkerque-1.jpg" }],
  ["strasbourg", "Strasbourg", "Strasbourg (cuirassé)", "FRA"],
  ["le-fantasque", "Le Fantasque", "Le Fantasque (contre-torpilleur)", "FRA"],
  ["surcouf", "Surcouf", "Surcouf (sous-marin)", "FRA"],
  ["bearn", "Béarn", "Béarn (porte-avions)", "FRA"],
  // Allemagne
  ["bismarck", "Bismarck", "Bismarck (cuirassé)", "GER"],
  ["tirpitz", "Tirpitz", "Tirpitz (cuirassé)", "GER"],
  ["scharnhorst", "Scharnhorst", "Scharnhorst (cuirassé)", "GER", { file: "Scharnhorst in Harbor.jpg" }],
  ["graf-spee", "Admiral Graf Spee", "Admiral Graf Spee", "GER"],
  // Royaume-Uni
  ["hood", "HMS Hood", "HMS Hood (51)", "GBR"],
  ["nelson", "HMS Nelson", "HMS Nelson (28)", "GBR"],
  ["ark-royal", "HMS Ark Royal", "HMS Ark Royal (91)", "GBR"],
  ["prince-of-wales", "HMS Prince of Wales", "HMS Prince of Wales (53)", "GBR"],
  // Italie
  ["littorio", "Littorio", "Littorio (cuirassé)", "ITA"],
  ["vittorio-veneto", "Vittorio Veneto", "Vittorio Veneto (cuirassé)", "ITA"],
  ["conte-di-cavour", "Conte di Cavour", "Conte di Cavour (cuirassé)", "ITA"],
  // URSS
  ["marat", "Marat", "Petropavlovsk (cuirassé, 1911)", "SOV"],
  // États-Unis
  ["arizona", "USS Arizona", "USS Arizona (BB-39)", "USA"],
  ["enterprise", "USS Enterprise", "USS Enterprise (CV-6)", "USA"],
  ["missouri", "USS Missouri", "USS Missouri (BB-63)", "USA"],
  // Japon
  ["yamato", "Yamato", "Yamato (cuirassé)", "JAP"],
  ["musashi", "Musashi", "Musashi (cuirassé)", "JAP"],
  ["akagi", "Akagi", "Akagi (porte-avions)", "JAP"],
]);

/** Armes et matériels qui illustrent les divisions et la production. */
const EQUIPMENT = rows("equipment", [
  ["infanterie", "Infanterie", "Infanterie"],
  ["artillerie", "Artillerie", "Artillerie"],
  ["char-b1", "Char B1 bis", "Char B1", "FRA"],
  ["renault-r35", "Renault R35", "Renault R35", "FRA"],
  ["somua-s35", "SOMUA S35", "SOMUA S35", "FRA"],
  ["canon-75", "Canon de 75 modèle 1897", "Canon de 75 modèle 1897", "FRA"],
  ["mas-36", "Fusil MAS 36", "MAS 36", "FRA"],
  ["ms406", "Morane-Saulnier MS.406", "Morane-Saulnier MS.406", "FRA", { file: "MS 406 fighters in Syria July 1941.jpg" }],
  ["d520", "Dewoitine D.520", "Dewoitine D.520", "FRA"],
  ["maginot", "Ligne Maginot", "Ligne Maginot", "FRA"],
  ["panzer-i", "Panzer I", "Panzerkampfwagen I", "GER"],
  ["panzer-iii", "Panzer III", "Panzerkampfwagen III", "GER"],
  ["panzer-iv", "Panzer IV", "Panzerkampfwagen IV", "GER"],
  ["bf109", "Messerschmitt Bf 109", "Messerschmitt Bf 109", "GER"],
  ["ju87", "Junkers Ju 87 Stuka", "Junkers Ju 87", "GER"],
  ["flak-88", "Canon de 88 mm", "8,8 cm FlaK 18/36/37/41", "GER"],
  ["matilda", "Matilda II", "Matilda II", "GBR"],
  ["spitfire", "Supermarine Spitfire", "Supermarine Spitfire", "GBR"],
  ["hurricane", "Hawker Hurricane", "Hawker Hurricane", "GBR"],
  ["t26", "T-26", "T-26", "SOV"],
  ["bt7", "BT-7", "BT-7", "SOV"],
  ["t34", "T-34", "T-34", "SOV"],
  ["i16", "Polikarpov I-16", "Polikarpov I-16", "SOV"],
  ["fiat-l3", "Chenillette L3", "L3/35", "ITA"],
  ["m13-40", "Fiat M13/40", "Fiat M13/40", "ITA"],
  ["sherman", "M4 Sherman", "M4 Sherman", "USA"],
  ["b17", "Boeing B-17", "Boeing B-17 Flying Fortress", "USA"],
  ["zero", "Mitsubishi A6M Zero", "Mitsubishi A6M Zero", "JAP"],
]);

/** Capitales, ports et villes clés de la guerre. */
const CITIES = rows("city", [
  ["paris", "Paris", "Paris"], ["berlin", "Berlin", "Berlin"], ["londres", "Londres", "Londres"],
  ["rome", "Rome", "Rome"], ["moscou", "Moscou", "Moscou"], ["varsovie", "Varsovie", "Varsovie"],
  ["madrid", "Madrid", "Madrid"], ["vienne", "Vienne", "Vienne (Autriche)"], ["prague", "Prague", "Prague"],
  ["bruxelles", "Bruxelles", "Bruxelles"], ["amsterdam", "Amsterdam", "Amsterdam"], ["belgrade", "Belgrade", "Belgrade"],
  ["bucarest", "Bucarest", "Bucarest"], ["budapest", "Budapest", "Budapest"], ["athenes", "Athènes", "Athènes"],
  ["ankara", "Ankara", "Ankara"], ["istanbul", "Istanbul", "Istanbul"], ["oslo", "Oslo", "Oslo"],
  ["stockholm", "Stockholm", "Stockholm"], ["helsinki", "Helsinki", "Helsinki"], ["copenhague", "Copenhague", "Copenhague"],
  ["lisbonne", "Lisbonne", "Lisbonne"], ["berne", "Berne", "Berne"], ["dublin", "Dublin", "Dublin"],
  ["tallinn", "Tallinn", "Tallinn"], ["riga", "Riga", "Riga"], ["kaunas", "Kaunas", "Kaunas"],
  ["dantzig", "Dantzig", "Gdańsk"], ["tokyo", "Tokyo", "Tokyo"], ["washington", "Washington", "Washington (district de Columbia)"],
  ["new-york", "New York", "New York"], ["nankin", "Nankin", "Nankin"], ["shanghai", "Shanghai", "Shanghai"],
  ["le-caire", "Le Caire", "Le Caire"], ["alger", "Alger", "Alger"], ["leningrad", "Leningrad", "Saint-Pétersbourg"],
  ["stalingrad", "Stalingrad", "Volgograd"], ["kiev", "Kiev", "Kiev"], ["minsk", "Minsk", "Minsk"],
  ["odessa", "Odessa", "Odessa"], ["sebastopol", "Sébastopol", "Sébastopol"], ["strasbourg", "Strasbourg", "Strasbourg"],
  ["marseille", "Marseille", "Marseille"], ["lyon", "Lyon", "Lyon"], ["brest", "Brest", "Brest"],
  ["toulon", "Toulon", "Toulon"], ["dunkerque", "Dunkerque", "Dunkerque"], ["hambourg", "Hambourg", "Hambourg"],
  ["munich", "Munich", "Munich"], ["kiel", "Kiel", "Kiel"], ["barcelone", "Barcelone", "Barcelone"],
  ["guadalajara", "Guadalajara", "Guadalajara (Espagne)"], ["gibraltar", "Gibraltar", "Gibraltar"], ["malte", "Malte", "Malte"],
  ["alexandrie", "Alexandrie", "Alexandrie"], ["singapour", "Singapour", "Singapour"], ["hong-kong", "Hong Kong", "Hong Kong"],
  ["pearl-harbor", "Pearl Harbor", "Pearl Harbor"], ["manille", "Manille", "Manille"], ["narvik", "Narvik", "Narvik"],
  ["rotterdam", "Rotterdam", "Rotterdam"], ["coventry", "Coventry", "Coventry"], ["portsmouth", "Portsmouth", "Portsmouth"],
  ["scapa-flow", "Scapa Flow", "Scapa Flow"], ["tobrouk", "Tobrouk", "Tobrouk"], ["dakar", "Dakar", "Dakar"],
  ["hanoi", "Hanoï", "Hanoï"],
]);

/** Événements pour le journal, les télégrammes et l'encyclopédie. */
const EVENTS = rows("event", [
  ["front-populaire", "Front populaire", "Front populaire (France)"],
  ["rhenanie", "Remilitarisation de la Rhénanie", "Remilitarisation de la Rhénanie"],
  ["guerre-espagne", "Guerre d'Espagne", "Guerre d'Espagne"],
  ["guadalajara", "Bataille de Guadalajara", "Bataille de Guadalajara"],
  ["ethiopie", "Seconde guerre italo-éthiopienne", "Seconde guerre italo-éthiopienne"],
  ["anschluss", "Anschluss", "Anschluss", undefined, { file: "Anschluss Heldenplatz1.jpg", sensitive: true }],
  ["munich", "Accords de Munich", "Accords de Munich"],
  ["pacte-germano-sovietique", "Pacte germano-soviétique", "Pacte germano-soviétique"],
  ["invasion-pologne", "Invasion de la Pologne", "Invasion de la Pologne"],
  ["guerre-hiver", "Guerre d'Hiver", "Guerre d'Hiver"],
  ["bataille-france", "Bataille de France", "Bataille de France"],
  ["armistice-1940", "Armistice du 22 juin 1940", "Armistice du 22 juin 1940", undefined, { file: "Bundesarchiv Bild 146-2004-0147, Waffenstillstand von Compiègne, Waggon.jpg", sensitive: true }],
  ["mers-el-kebir", "Attaque de Mers el-Kébir", "Attaque de Mers el-Kébir"],
  ["bataille-angleterre", "Bataille d'Angleterre", "Bataille d'Angleterre"],
  ["barbarossa", "Opération Barbarossa", "Opération Barbarossa"],
  ["pearl-harbor", "Attaque de Pearl Harbor", "Attaque de Pearl Harbor"],
  ["midway", "Bataille de Midway", "Bataille de Midway"],
  ["el-alamein", "Seconde bataille d'El Alamein", "Seconde bataille d'El Alamein"],
  ["stalingrad", "Bataille de Stalingrad", "Bataille de Stalingrad"],
  ["koursk", "Bataille de Koursk", "Bataille de Koursk"],
  ["normandie", "Débarquement de Normandie", "Débarquement de Normandie"],
  ["liberation-paris", "Libération de Paris", "Libération de Paris"],
  ["capitulation-allemagne", "Capitulation de l'Allemagne", "Capitulation de l'Allemagne nazie"],
  ["capitulation-japon", "Capitulation du Japon", "Capitulation du Japon"],
]);

export const CATALOG: readonly CatalogEntry[] = [
  ...FLAGS, ...LEADERS, ...GENERALS, ...ADMIRALS, ...SHIPS, ...EQUIPMENT, ...CITIES, ...EVENTS,
];

/** Largeur des vignettes demandées à Commons, par type (tailles standard de Wikimedia). */
export const THUMB_WIDTH: Record<ImageKind, number> = {
  flag: 120, leader: 330, general: 330, admiral: 330, ship: 500, equipment: 500, city: 500, event: 500,
};
