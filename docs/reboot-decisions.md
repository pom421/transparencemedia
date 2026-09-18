# Reboot de transparencemedia — journal des décisions

Document alimenté au fil de l'interview (`/grill-me`) du 2026-09-19.
Chaque décision est notée avec sa justification pour survivre aux changements de machine et de session.

## Résumé

**Quoi.** Réécriture complète du site « Qui détient nos médias ? » à partir de zéro, en monorepo pnpm avec deux apps (site Next 16 en export statique sur GitHub Pages, extension Chrome/Firefox construite avec WXT) et trois packages partagés (`data`, `domain`, `config`). TypeScript strict, Biome, Vitest, Turborepo, Node 24, gestionnaires de paquets autres que pnpm bloqués.

**Données.** La source de vérité est le dépôt `mdiplo/Medias_francais` du Monde diplomatique (sept TSV, licence ODC-By, 218 médias, 78 organisations, 38 personnes, 314 liens), copié tel quel dans `packages/data/upstream/` et mis à jour par un workflow mensuel qui ouvre une PR. Une surcouche YAML facultative, clée par slug dérivé du nom amont, apporte ce que le Monde diplo n'a pas : `domaines` (prioritaire, il alimente l'extension), Wikipedia, devise, revenus, notes, corrections sourcées. Le YAML est lu en YAML 1.2, validé par Zod, assisté d'un JSON Schema dans l'éditeur ; les booléens restent `oui`/`non`.

**Domaine.** Deux notions séparées : la part économique (multipliée le long des liens `égal à`, « inconnue » dès qu'un maillon n'a pas de valeur) et la chaîne de contrôle (parcours du graphe sur tous les liens). Vocabulaire métier en français, plomberie en anglais.

**Site.** Server Components pour tout le contenu, Tailwind 4 + shadcn/ui, chaîne de contrôle en SVG calculé au build sur chaque page média, recherche client sur un index JSON, galaxie d3-force plus tard. Pages v1 : accueil, kiosque, média, organisation, personne, à propos, crédits, contribuer.

**Contribution.** Les erreurs de données amont se corrigent chez le Monde diplo ; les enrichissements passent par PR sur la surcouche, avec un formulaire d'issue GitHub structuré.

**Livraison.** Branche `main`, CI sur PR (lint, types, tests, intégrité des données, build), déploiement Pages sur push, Renovate. Le site n'a pas de version ; l'extension est en CalVer. Sept étapes, site en ligne dès la quatrième.

## Contexte de départ (constaté dans le dépôt)

- Dernier commit fonctionnel : juillet 2022. Stack : Next 12 (pages router), React 17, Chakra UI 1, TS 4.5 non strict, Yarn 1, Jest 27.
- Domaine : ~88 entités (journaux, sociétés, individus, holdings) dans `src/data/entités.yaml`, un modèle d'analyse d'actionnariat récursif dans `src/domain/model.js` (Ramda), une visualisation en graphe (vis.js 4, EOL) et d3.
- Données Wikipedia récupérées au runtime côté client (fetch-jsonp).
- Issues ouvertes pertinentes : #20 (format des données : proposition data.ts + SQLite/Prisma), #11 (CSV du Monde diplomatique comme source de vérité).
- Node 24 disponible, corepack présent, pnpm non installé.

### Source de données : dépôt `mdiplo/Medias_francais` (analysé le 2026-09-19)

Licence ODC-By 1.0, dernière mise à jour décembre 2024. Sept tables TSV, UTF-8, **CRLF** (contrairement à ce que demande leur README), **jointes par nom** : les tables d'entités n'ont pas de colonne id.

| Table | Lignes | Colonnes |
|---|---|---|
| `medias.tsv` | 218 | Nom, Type (Presse 152 / Télévision 32 / Radio 24 / Site 9), Periodicite, Echelle (Régional / National / International / Suisse…), Prix (Payant / Gratuit), Disparu (`checked` ou vide) |
| `organisations.tsv` | 78 | nom, commentaire |
| `personnes.tsv` | 38 | Nom, rangChallenges2021..2024, milliardaireForbes2021..2024 |
| `personne-media.tsv` | 4 | id, origine, qualificatif, valeur, cible |
| `personne-organisation.tsv` | 41 | idem + commentaire |
| `organisation-organisation.tsv` | 43 | idem + commentaire |
| `organisation-media.tsv` | 226 | id, origine, qualificatif, valeur, cible |

- `qualificatif` ∈ { `égal à`, `contrôle`, `participe`, `supérieur à`, `inférieur à` } ; `valeur` est un pourcentage texte (`100.00%`) ou vide (surtout avec `contrôle`).
- Les `id` des tables de liens ne sont pas uniques entre tables (230 uniques sur 314).
- Intégrité : 1 cible inconnue (`Le Un Hebdo` absent de `medias.tsv`), 2 médias sans actionnaire, 13 organisations sommet (État, Crédit Mutuel, QIA…).
- Absent des TSV et présent dans l'ancien `entités.yaml` : site web, Wikipedia, date de création, devise, modèle de revenus, accès gratuit, journalistes, forme juridique, secteurs, fortune.

## Décisions prises

| # | Sujet | Décision | Pourquoi |
|---|-------|----------|----------|
| D1 | Framework | Next.js 16 (dernière version) | Reprendre avec la stack actuelle plutôt que migrer version par version. |
| D2 | Gestionnaire de paquets | pnpm, autres gestionnaires bloqués | Monorepo, install rapide, verrouillage via `packageManager` + `only-allow`. |
| D3 | Structure | Monorepo pnpm (workspaces) | Séparer données, domaine et app web. Détail des packages à trancher. |
| D4 | TypeScript | `strict: true` | Fiabilité du modèle de données et du domaine. |
| D5 | Format des données | **Révisé par D11** : la source de vérité est le TSV du Monde diplomatique ; le rôle du YAML est retranché à ce que D11 décide. | Question 5 : « tout vient du fichier TSV du Monde diplomatique ». |
| D6 | Périmètre | Réécriture from scratch : nouveau squelette monorepo, ancien code gardé dans l'historique git comme référence pour porter domaine et données | Code petit (10 composants, domaine en 250 lignes) ; une migration en place ferait payer deux fois pages router puis App Router. |
| D7 | Découpage monorepo | `apps/web` (Next 16), `packages/data` (YAML + schéma + chargeur + contrôle d'intégrité), `packages/domain` (modèle d'actionnariat en TS pur), `packages/config` (tsconfig/lint partagés) | Le contrôle d'intégrité des données tourne en CI sans construire le site ; le domaine est testable hors Next. `packages/data` prévu pour accueillir un import Monde diplo (issue #11) plus tard. **Amendé par D20** : une seconde app `apps/extension` (extension Chrome/Firefox) est prévue, ce qui justifie pleinement le monorepo : `packages/data` et `packages/domain` sont partagés entre le site et l'extension. |
| D8 | Outillage | Node 24 LTS (`.nvmrc`, `engines`) ; verrou pnpm par `packageManager` + corepack, `preinstall: only-allow pnpm`, `engine-strict=true` ; Turborepo ; Biome 2 pour lint et format ; Vitest ; Playwright plus tard | Trois verrous complémentaires sur le gestionnaire de paquets ; un seul outil de lint/format ; cache CI via Turborepo. |
| D9 | Parade « Norway » et validation | Trois couches : parser `yaml` (eemeli) en YAML 1.2 schéma core ; schéma Zod dans `packages/data` validant chaque entité au chargement ; JSON Schema généré depuis Zod et référencé en tête des YAML pour validation et autocomplétion dans l'éditeur. Plus un script d'intégrité (références inconnues, parts > 100 %) et un test unitaire chargeant un YAML contenant `NO`. | Le parser 1.2 supprime la cause, Zod garantit le type indépendamment du parser, le JSON Schema aide le contributeur au moment de la saisie. |
| D10 | Booléens en YAML | On garde `oui` / `non` (chaînes, énumération Zod `"oui" \| "non"`, convertis en `boolean` côté domaine) | Lisibilité pour les contributeurs francophones ; le coût de conversion est localisé dans le chargeur de `packages/data`. |
| D11 | Rôle du TSV et du YAML | TSV du Monde diplomatique = source de vérité, copié tel quel dans `packages/data/upstream/` avec le commit amont épinglé et un script de mise à jour qui normalise (CRLF, pourcentages, noms) et valide avec Zod. YAML = surcouche d'enrichissement facultative, clé par le nom du média/organisation/personne : site web, Wikipedia, devise, revenus, notes, corrections. Le domaine fusionne les deux. D9 et D10 s'appliquent à la surcouche. | On suit les mises à jour amont sans les recopier à la main ; la séparation source/enrichissement rend l'attribution ODC-By explicite. |
| D12 | Identifiants et URLs | Slug déterministe dérivé du nom amont (accents retirés, apostrophes normalisées) : `Le Monde` → `le-monde`. Clé de la surcouche YAML. Champ facultatif `alias` dans la surcouche pour absorber un renommage amont. Le script d'intégrité échoue si une clé YAML ne correspond à aucun nom amont. URLs : `/media/<slug>`, `/organisation/<slug>`, `/personne/<slug>`. | Aucune table de correspondance à maintenir ; les renommages amont sont détectés en CI. |
| D13 | Modèle de domaine : liens sans pourcentage | Deux notions distinctes dans `packages/domain` : (1) **part économique**, calculée sur les seuls liens `égal à` avec valeur, multipliée le long de la chaîne, marquée « inconnue » dès qu'un maillon n'a pas de valeur, bornes `supérieur à` / `inférieur à` prises avec un drapeau « approximatif » ; (2) **contrôle**, parcours du graphe sur tous les types de liens sans arithmétique, répondant à « qui est au bout de la chaîne ». Une page média affiche les deux. | 30 liens sur 314 n'ont pas de pourcentage ; assimiler `contrôle` à 100 % serait faux. Le contrôle est ce que montre le poster du Monde diplo. |
| D14 | Rendu et hébergement | Next 16 App Router, export statique (`output: "export"`), pages générées au build via `generateStaticParams` ; Server Components asynchrones pour tout le contenu, composants client limités au graphe et à la recherche ; enrichissement Wikipedia au build avec cache commité ; recherche côté client sur un index JSON généré au build. Hébergement GitHub Pages via GitHub Actions pour commencer. Pas de SQLite/Prisma (issue #20 abandonnée sur ce point). Server Actions, `after()`, cache dynamique et ISR non utilisés : sans objet sans serveur ; réactivables en retirant `output: "export"` si l'hébergement change. | Données statiques (~334 entités, quelques mises à jour par an) ; `transparencemedia.fr` ne résout plus, aucune production existante à respecter. |
| D15 | Interface | Tailwind 4 + shadcn/ui (composants copiés dans le dépôt, Radix pour l'accessibilité), thème sobre, mode sombre. | CSS statique compatible Server Components ; Chakra/Emotion imposerait `"use client"` partout. |
| D16 | Visualisation | Page média : chaîne de contrôle en SVG calculé au build dans le Server Component (layout hiérarchique d3-dag ou elkjs), avec `title` et tableau équivalent sous le graphe ; zoom/survol en amélioration progressive plus tard. Graphe complet (« galaxie ») : composant client d3-force, dans un second temps. Condition posée : retenir au moment de l'implémentation la bibliothèque la plus récente et la plus utilisée (d3-force est la base de la plupart des alternatives, dont react-force-graph ; Sigma.js à comparer si le graphe complet devient lourd). | Graphes média petits (< 15 nœuds) : zéro JS client, indexable, accessible. vis.js 4 est en fin de vie. |
| D17 | Pages v1 | Accueil (chiffres clés au build) ; kiosque `/medias` avec filtres amont (type, périodicité, échelle, prix) et recherche par nom ; `/media/<slug>` (fiche, détenteurs finaux, chaîne de contrôle SVG, enrichissements, médias de la même famille) ; `/organisation/<slug>` et `/personne/<slug>` (détentions directes et indirectes, classements Challenges/Forbes) ; à propos, crédits, contribuer (attribution ODC-By). Reporté : galaxie complète, captures de publicité, subventions et audiences de l'ancien dépôt. Site en français uniquement, sans i18n ; pas de suivi d'audience en v1. | Ordre de valeur pour le lecteur ; les données reportées n'ont pas d'équivalent amont. |
| D18 | Langue du code | Français pour le vocabulaire métier (types, entités, fonctions du domaine : `Media`, `Organisation`, `Personne`, `Actionnariat`, `partEconomique`, `chaineDeControle`…), anglais pour la plomberie technique (chargeurs, utilitaires, config, scripts, noms de packages). Identifiants sans accents ni caractères spéciaux. | Le domaine reste lisible pour un contributeur francophone et aligné sur les colonnes du Monde diplo ; l'outillage reste conventionnel. |
| D19 | Contribution | Deux flux : (1) erreur dans les données amont → issue/PR chez `mdiplo/Medias_francais`, récupérée par le script de mise à jour ; (2) enrichissement → PR sur la surcouche YAML de ce dépôt, validée en CI par le JSON Schema et le contrôle d'intégrité. Formulaire d'issue GitHub structuré (`.github/ISSUE_TEMPLATE/enrichissement.yml`) plutôt que Typeform. Correction locale d'une donnée amont possible en urgence via un champ `corrections` de la surcouche, avec source et lien vers l'issue amont obligatoires. | Éviter de diverger de la source ; contribution gratuite et traçable dans le dépôt. |
| D20 | CI/CD, branche, versions | Branche principale renommée `main` (déploiement sur push vers `main`). CI sur chaque PR : pnpm lockfile gelé, puis via Turborepo lint Biome, typecheck, Vitest, contrôle d'intégrité des données, build. Déploiement GitHub Pages par les actions officielles, sans token personnel. Workflow mensuel de mise à jour des TSV amont ouvrant une PR si changement. Renovate, PR hebdomadaire groupée. Site : pas de numéro de version, semantic-release abandonné, convention de commits conservée. Extension Chrome/Firefox (`apps/extension`) : **CalVer** (`AAAA.MM.N`), publiée par un workflow déclenché par tag. | Un site n'a pas besoin de changelog versionné ; une extension distribuée sur les stores en a besoin, et CalVer dit directement l'âge des données embarquées. |
| D21 | Extension Chrome/Firefox | Rôle : l'icône s'active sur le site d'un média connu ; le popup montre le propriétaire final, la chaîne de contrôle résumée et un lien vers la page média. Correspondance par un champ **`domaines`** (liste) dans la surcouche YAML, et non un simple `web` : un média a plusieurs sites (éditions régionales, sous-marques, anciens domaines). `apps/extension` dans le monorepo. Données embarquées au build (JSON généré depuis `packages/data`, pré-calculé par `packages/domain`), aucune requête réseau au runtime. Manifest V3, WXT. Permissions minimales : liste d'hôtes générée depuis `domaines`, pas de `<all_urls>`. | Vie privée, hors ligne, aucun serveur ; revue par les stores facilitée. `domaines` devient le champ prioritaire à renseigner pour les 218 médias. |
| D22 | Ordre de réalisation | 1. Squelette (pnpm, Turborepo, Biome, Vitest, `packages/config`, CI, renommage `master` → `main`, suppression de l'ancien code sauf `entités.yaml` déplacé en `packages/data/legacy/`). 2. `packages/data` (import TSV, Zod, slugs, intégrité, JSON Schema, test Norway). 3. `packages/domain` (part économique, contrôle, familles, tests sur cas réels : Arte, Lagardère, Le Monde libre). 4. `apps/web` v1 + GitHub Pages : premier site en ligne. 5. Surcouche YAML (reprise des 27 anciennes entités, `domaines` des principaux médias, suppression de `legacy/`). 6. `apps/extension` (WXT, première CalVer). 7. Galaxie d3-force, puis Playwright. | Chaque étape laisse la CI verte ; site en ligne dès l'étape 4 pour valider le pipeline avant tout enrichissement. |

## Points laissés ouverts

- **Permissions de l'extension** (étape 6) : activation automatique de l'icône (`tabs` ou `host_permissions`, avertissement à l'installation) contre `activeTab` (silencieux, mais un clic requis).
- **Bibliothèque du graphe complet** (étape 7) : d3-force par défaut, comparer avec Sigma.js si le rendu de 334 nœuds est lourd.
- **Wikipedia** : ce qu'on récupère (résumé, image) et l'attribution CC BY-SA à afficher.
- **Accessibilité** : niveau visé (RGAA / WCAG AA) à fixer avant l'étape 4.
- **Domaine `transparencemedia.fr`** : ne résout plus ; à récupérer ou à remplacer.

