# ADR 003 — Photos de Courses dans PostgreSQL

- **Statut** : accepté
- **Date** : 2026-07-30

## Contexte

Le disque local Fly.io est éphémère et ne peut pas conserver les photos de
référence entre les cycles de la machine.

## Décision

Compresser les photos côté client puis les stocker dans `courses.photo` au
format `BYTEA`.

## Conséquences

- persistance indépendante de la machine ;
- corps JSON limité à 4 Mo ;
- poids des images supporté par la base ;
- cache local possible pour l’usage en magasin.
