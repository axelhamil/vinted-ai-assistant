@plan.md @activity.md @PRD.md

Tu construis "Vinted AI Assistant" - une extension Chrome + backend local pour analyser les opportunités de revente sur Vinted.

## Instructions

1. Lis `activity.md` pour voir ce qui a été accompli récemment.

2. Ouvre `plan.md` et trouve la PREMIÈRE tâche où `"passes": false`.

3. Travaille sur EXACTEMENT UNE tâche :
   - Implémente les changements nécessaires
   - Suis la Clean Architecture définie dans le PRD
   - Respecte les conventions TypeScript strict (pas de `any`)

4. Après implémentation :
   - Lance le linter : `pnpm lint`
   - Lance le typecheck : `pnpm typecheck`
   - Si backend : teste avec `curl` ou vérifie que le serveur démarre
   - Si extension : vérifie que le build passe

5. Mets à jour `activity.md` :
   - Ajoute une entrée datée décrivant ce que tu as changé
   - Liste les fichiers créés/modifiés
   - Note les commandes exécutées et leur résultat

6. Dans `plan.md`, mets à jour la tâche : `"passes": false` → `"passes": true`

7. Fais UN commit git avec un message clair :
   ```
   git add -A
   git commit -m "feat: [description courte de la tâche]"
   ```

## Règles strictes

- NE travaille que sur UNE SEULE tâche par itération
- NE modifie PAS les autres tâches dans plan.md
- NE fais PAS `git init`, `git remote`, ou `git push`
- NE saute PAS de tâches - respecte l'ordre
- SI une tâche échoue, note l'erreur dans activity.md et passe à la suivante

## Structure attendue

```
vinted-ai-assistant/
├── apps/
│   ├── extension/     # Extension Chrome MV3
│   └── backend/       # Bun + Hono + Drizzle
├── packages/
│   └── shared/        # Types partagés
├── .claude/
│   └── settings.json
└── ...
```

## Completion

Quand TOUTES les tâches ont `"passes": true`, output exactement :

<promise>COMPLETE</promise>
