# War Board

Jeu de stratégie web sur la Seconde Guerre mondiale, en temps réel ralenti : une carte persistante de provinces, une gestion simplifiée (fronts, production, diplomatie) et un volet éducatif. Projet personnel, original : il s'inspire de mécaniques connues du genre sans en reprendre les noms, l'art ni les données.

![Aperçu du prototype : une offensive allemande en France, avril 1936](docs/apercu.jpg)

Ce dépôt contient le **prototype** : la carte des provinces du monde au 1er janvier 1936, une simulation qui avance d'un jour toutes les 5 secondes, en solo ou à plusieurs, et des divisions terrestres qui se déplacent et se battent.

## Démarrer

Prérequis : Node 22 ou plus récent et pnpm 10 (`corepack enable` suffit).

```bash
pnpm install
pnpm dev          # serveur de jeu (ws://localhost:2567) + client (http://localhost:5173)
```

Ouvrez http://localhost:5173, choisissez une nation, puis « Jouer en solo » ou « Rejoindre la partie multijoueur ». Pour jouer à plusieurs sur le même réseau, les autres joueurs ouvrent `http://<votre-ip>:5173`.

Autres commandes :

| Commande | Rôle |
| --- | --- |
| `pnpm test` | Tests de la simulation et du serveur |
| `pnpm typecheck` | Vérification TypeScript de tous les paquets |
| `pnpm build` | Build de production du client (`packages/client/dist`) |
| `pnpm map:build` | Régénère la carte depuis Natural Earth |

## Organisation

```
packages/
  sim/      Simulation pure et déterministe, partagée par le serveur et le client
  server/   Serveur Colyseus : une salle « partie », 8 joueurs au plus
  client/   Vite + React + PixiJS : salon, carte, panneau de province
  tools/    Préparation de la carte à partir de Natural Earth
```

### Simulation (`packages/sim`)

- L'état d'une partie (`GameState`) ne contient que des nombres et des tableaux : il se sérialise en JSON et donne exactement le même résultat sur toutes les machines.
- `step(state, commandes)` avance d'un jour sans modifier l'état précédent. Aucun appel à `Date` ni à `Math.random` : le hasard passe par un générateur à graine stocké dans l'état.
- `GameClock` convertit le temps réel en jours : 1 jour pour 5 secondes à vitesse normale. Les vitesses ×2, ×5 et ×20 servent aux tests.
- Les ordres des joueurs sont appliqués au début du jour suivant, dans l'ordre reçu.
- L'économie est un simple compteur de production pour l'instant. L'outil de test « Annexer » donne une province à sa nation.

#### Divisions et combats (`units.ts`, `military.ts`, `scenario/army1936.ts`)

- Cinq types de divisions prêtes à l'emploi : infanterie, cavalerie, infanterie motorisée, blindés, artillerie. Chacune a une attaque, une défense, une vitesse (km par jour) et un blindage. Un niveau d'amélioration est prévu (+10 % par niveau), sans moyen de l'augmenter pour l'instant.
- Armées de départ inspirées des effectifs de 1936, arrondies, par piles de trois réparties sur le territoire.
- Ordres : `unit.move` (chemin le plus court en kilomètres, par voie de terre, chez soi ou chez un ennemi) et `unit.stop`. Les divisions parties ensemble d'une même province avancent au pas de la plus lente.
- Une division qui arrive à la frontière d'une province tenue par l'ennemi l'attaque. Chaque jour, les deux camps s'infligent des dégâts selon leur attaque ou leur défense, leur santé, un tirage entre 0,85 et 1,15, le blindage, un bonus de flanc par direction d'attaque et un bonus de défense dans les capitales.
- Sous 25 % de santé, un attaquant renonce et un défenseur se replie vers une province amie libre. S'il n'en a aucune, il est détruit (encerclement). Hors combat, une division regagne 4 % par jour.
- Entrer dans une province ennemie sans défenseur l'occupe. Une nation sans province capitule et ses divisions disparaissent.
- `war.declare` déclare la guerre. C'est une version minimale pour tester les combats ; la vraie diplomatie de guerre (buts de guerre, paix, alliances) viendra plus tard. La partie commence avec la guerre d'Éthiopie (Italie contre Éthiopie).
- `step` renvoie aussi des événements (guerre, occupation, attaque repoussée, repli, division détruite) que le client affiche.

### Serveur (`packages/server`)

Colyseus 0.18. Le serveur fait tourner la simulation et synchronise vers les clients le jour, la vitesse, le propriétaire de chaque province, les divisions, les guerres, les batailles et la liste des joueurs. Il renvoie à chaque joueur ses ordres refusés et diffuse les événements du jour. Une nation ne peut être jouée que par une personne. Le premier joueur arrivé est l'hôte et règle la vitesse.

### Client (`packages/client`)

- En solo, la simulation tourne dans le navigateur avec la même fonction `step` que le serveur.
- La carte est dessinée avec PixiJS : couleur par propriétaire, frontières de nations recalculées à chaque changement, noms des pays, noms des provinces au zoom, capitales.
- Molette pour zoomer, glisser pour se déplacer, clic pour voir une province.
- Divisions : clic sur un de vos pions pour le sélectionner (Maj + clic pour ajouter), Maj + glisser pour sélectionner au rectangle, **clic droit** sur une province pour y envoyer la sélection (ou bouton « Déplacer » puis clic). Le panneau de droite montre chaque division, sa santé et son trajet.
- Le panneau d'une province étrangère propose « Déclarer la guerre ». Les batailles s'affichent avec ⚔ sur la frontière, les messages du jour en bas de l'écran.
- En vue d'ensemble, seuls vos pions et ceux de vos ennemis restent affichés.
- Couleurs, polices et tailles de la carte sont regroupées dans `packages/client/src/map/theme.ts`, en vue de la refonte graphique prévue (carte façon papier mat, tons pastel).

## La carte de 1936

`pnpm map:build` télécharge les régions administratives et les villes de [Natural Earth](https://www.naturalearthdata.com/) (domaine public) au 1:10 000 000, puis :

1. projette le monde en projection cylindrique de Miller, centrée sur 10° E, de 56° S à 78° N (16 000 × 7 259 unités) ;
2. simplifie en conservant les frontières communes ;
3. applique les frontières de janvier 1936 (`packages/tools/src/borders1936.ts`) : rattachement de régions entières (Silésie et Prusse-Orientale allemandes, Wilno et Lwów polonais, Bessarabie roumaine, Istrie italienne, Mandchoukouo, Tibet, Xinjiang, Touva, Corée et Taïwan japonaises, Terre-Neuve, Inde portugaise et française, protectorat d'Aden, Cameroun britannique, colonies et mandats...) et découpes à la main là où la frontière coupe une région actuelle (couloir de Dantzig, ligne du traité de Riga, Carélie finlandaise, Dodécanèse, Jehol, Karafuto...) ;
4. découpe les grandes régions autour de leurs villes principales et fusionne les trop petites. Les provinces sont fines en Europe (environ 15 000 km²), moyennes en Afrique du Nord, au Proche-Orient, en Asie de l'Est, dans le Raj et dans l'est de l'Amérique du Nord (40 000 km²), larges ailleurs (90 000 km²). Résultat : environ 2 850 provinces et 76 nations ;
5. nomme chaque province d'après sa plus grande ville, avec le nom d'époque quand il a changé (Königsberg, Breslau, Wilno, Stalingrad, Peiping, Hsinking, Keijō, Batavia, Léopoldville...).

Le résultat est versionné : `packages/client/public/map/world-1936.topo.json` (géométrie) et `packages/sim/src/scenario/provinces1936.json` (noms, propriétaires, voisinages, capitales). Le script est déterministe : deux exécutions donnent les mêmes fichiers.

Limites connues : les découpes tracées à la main sont approximatives (à quelques kilomètres près), les micro-États sont rattachés à leur voisin, les provinces découpées sans ville notable portent un nom de région suivi d'une direction (« Vologda nord »), et la coupure de la carte passe par le détroit de Béring (l'Alaska et la Tchoukotka ne sont pas voisins). Les Philippines sont rattachées aux États-Unis et Oman au Royaume-Uni.

## Suite prévue

- Persistance des parties avec PostgreSQL.
- Économie et production : ressources par province, usines, file de production d'unités.
- Guerre et capitulation : buts de guerre, paix, alliances.
- IA de base pour jouer en solo.
- Marine (zones maritimes, ports, navires historiques, transports), puis diplomatie et focus nationaux.
- Refonte graphique de l'interface.
- Déploiement sur un petit VPS (serveur de jeu, base et proxy HTTPS en Docker Compose).

## Licences des données

Carte dérivée de Natural Earth, dans le domaine public. Les frontières de 1936 sont une reconstitution propre à War Board.
