# Qualité

## Sources de vérité

- **Jira** : exécution, priorité et statut des Bugs et Corrections.
- **Notion** : bases Bugs, Corrections et BFV, campagnes et connaissance QA.
- **`docs/bugs.md`** : registre local opérationnel, autonome et à jour des
  Bugs, Corrections et BFV. Un agent doit pouvoir y comprendre une anomalie
  sans ouvrir Notion.
- **`docs/sync-log.md`** : messages de passage entre ChatGPT et Claude.

Un même fait ne doit être réécrit dans plusieurs documents que lorsqu’il
s’agit d’un miroir explicitement identifié.

## Politique de lecture locale

- Lire d’abord `docs/bugs.md` pour les anomalies et `docs/sync-log.md` pour
  le passage entre agents.
- Mettre à jour les documents concernés pendant la tâche, pas après coup.
- Toute nouvelle règle de travail donnée par Olumide doit être intégrée aux
  documents concernés pendant la même tâche.
- Consulter Jira ou Notion seulement si l’action exige leur état actuel, une
  recherche de doublon ou une modification externe.
- Si le local et un outil externe divergent, ne pas deviner : signaler le
  conflit à Olumide.

## Workflow d’une anomalie

1. Enregistrer le Bug comme **Ouvert** avant de modifier le code.
2. Décrire les étapes, le résultat attendu, le résultat obtenu et la sévérité.
3. Créer la Correction séparément.
4. Corriger et vérifier techniquement le chemin réel lorsque l’environnement
   le permet.
5. Laisser la BFV à Olumide.

Les étapes Bug, Correction et BFV ont des horodatages distincts. Une
vérification technique par un agent ne remplace jamais la BFV utilisateur.

## Responsabilités

- Claude crée les entrées Bug et Correction dans le périmètre convenu.
- ChatGPT/Jira maintient les tickets d’exécution et leur structure.
- Olumide réalise la validation humaine et crée la BFV.
- L’agent qui effectue une action met immédiatement à jour le document local
  correspondant et, si l’autre agent doit la connaître, `docs/sync-log.md`.
- Un bug découvert incidemment peut être corrigé et vérifié localement, mais
  son enregistrement hors du dépôt exige l’accord d’Olumide.

## Organisation Jira et BFV

La hiérarchie, les modèles, Gherkin, les labels et les statuts sont définis
dans [Organisation Jira](jira.md).

Dans Chow, **BFV signifie Bug Fix Verification** et concerne uniquement les
Bugs. Une checklist Jira peut être préparée par un agent, mais seule la
vérification exécutée par Olumide produit l’entrée BFV dans Notion.

## Niveaux

| Niveau | Définition |
|---|---|
| Critique | Blocage complet, perte de données ou risque de sécurité |
| Majeure | Fonction principale incorrecte sans contournement raisonnable |
| Mineure | Défaut limité, visuel ou contournable |

## Standard de vérification

- Ne pas confondre lecture du code et exécution réelle.
- Redémarrer l’application après chaque modification.
- Tester la route et les calculs réellement concernés.
- Signaler explicitement ce qui exige un navigateur ou un appareil réel.
- Ne pas déclarer une BFV au nom d’Olumide.

## Couverture actuelle

Le projet ne possède ni tests automatisés, ni lint, ni navigateur headless.
Cette dette est suivie dans Jira :

- `CHOW-48` : tests automatisés et lint ;
- `CHOW-49` : modularisation du backend ;
- `CHOW-50` : préparation d’une migration React.
