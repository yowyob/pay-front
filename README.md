# YowYob Payment (yy-pay)

BFF Next.js pour l'API IWM - authentification, paiements, portefeuilles et abonnements, avec parcours métier complet **YowYob Payment**.

Les types TypeScript sont générés depuis les specs OpenAPI. Aucun schéma métier n'est défini en dur dans le code applicatif.

## Prérequis

- Node.js 20+
- npm

## Configuration

1. Copier le fichier d'exemple :

```bash
cp .env.example .env
```

1. Renseigner les variables dans `.env` :

| Variable                  | Description                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| `IWM_API_BASE_URL`        | URL de base de l'API IWM                                                                     |
| `IWM_CLIENT_ID`           | Identifiant client (`X-Client-Id`)                                                           |
| `IWM_API_KEY`             | Clé API (`X-Api-Key`)                                                                        |
| `IWM_TENANT_ID`           | Identifiant tenant Kernel (`X-Tenant-Id`)                                                    |
| `PAYMENT_PAYER_REFERENCE` | Référence payeur MYCOOLPAY (ex. `+237690295069`), injectée côté BFF                          |
| `COOKIE_ACCESS_TOKEN`     | Nom du cookie httpOnly JWT (défaut : `yy_pay_access_token`)                                  |
| `COOKIE_REFRESH_TOKEN`    | Nom du cookie refresh token                                                                  |
| `COOKIE_ORGANIZATION_ID`  | Nom du cookie organisation active                                                            |
| `COOKIE_WALLET_ID`        | Nom du cookie wallet actif                                                                   |
| `COOKIE_ACTOR_ID`         | Nom du cookie actor utilisateur                                                              |
| `PAYMENT_CALLBACK_URL`         | URL de retour MYCOOLPAY en cas de succès (ex. `http://localhost:3000/console?payment=success`) |
| `PAYMENT_FAILURE_CALLBACK_URL` | URL de retour MYCOOLPAY en cas d'échec ou d'annulation (ex. `http://localhost:3000/console?payment=failure`) |

## Parcours utilisateur

1. **Landing** (`/`) - présentation, ancres Documentation / Tarifs
2. **Login** (`/login`) - identifiants → MFA email → cookie httpOnly posé par le BFF
3. **Organisations** (`/organizations`) - `GET /api/auth/me/memberships` (ou `discover-contexts` en secours) puis `select-context`, cookie `organizationId`
4. **Console** (`/console`) - wallet, transactions, plans, panier
5. **Paiement** - via wallet (`purchase` par plan), MYCOOLPAY plans commerciaux (`commercial-plans/{planCode}/checkout` + devis serveur), ou recharge wallet provider (`recharge` + `recharge-orders/refresh`)

Le mot de passe n'est **jamais** stocké en cookie : il reste en mémoire (Zustand) uniquement pendant la sélection d'organisation.

Règle sécurité : le front **ne fournit jamais le montant** pour MYCOOLPAY - il choisit le `planCode`, la période (`MONTHLY`/`YEARLY`) et les add-ons ; le Kernel calcule le prix via `POST /api/commercial-plans/{planCode}/quote`. La recharge wallet suit le même principe : montant saisi pour la recharge provider, crédit effectif après `POST /api/payments/wallets/recharge-orders/{orderId}/refresh`.

## Commandes

```bash
# Générer les types payment + auth
npm run generate:api

# Build + démarrage
npm run dev

# Build de production (régénère les types via prebuild)
npm run build

# Démarrer en production
npm start

# Linter
npm run lint
```

## Authentification & session

- Le BFF pose des cookies **httpOnly** (`secure` en production, `sameSite: lax`)
- Le client front utilise `bff-client.ts` avec `credentials: "include"` - **aucun** header `Authorization` manuel
- `iwm-auth-client` / `iwm-payment-client` transmettent `X-Client-Id`, `X-Api-Key`, `X-Tenant-Id`
- Routes utilitaires : `GET /api/session/me`, `GET /api/session/context`

### Proxy (protection des routes)

- Public : `/`, `/login`, `/api/*`
- Protégé : `/organizations`, `/console`
- Sans token → `/login`
- Sans `organizationId` → `/organizations`

## Endpoints BFF - payment

| Méthode | Route                                                     | Opération                     |
| ------- | --------------------------------------------------------- | ----------------------------- |
| GET     | `/api/plans`                                              | listPlans                     |
| GET     | `/api/plans/subscriptions`                                | mySubscriptions               |
| GET     | `/api/plans/{code}`                                       | getPlan                       |
| PUT     | `/api/plans/{code}`                                       | savePlan                      |
| DELETE  | `/api/plans/{code}`                                       | deletePlan                    |
| POST    | `/api/plans/{code}/purchase`                              | purchase                      |
| POST    | `/api/payments/wallets`                                   | createWallet                  |
| GET     | `/api/payments/wallets/owner/{ownerId}`                   | getWalletByOwner              |
| GET     | `/api/payments/wallets/{walletId}`                        | getWallet                     |
| POST    | `/api/payments/wallets/{walletId}/recharge`               | recharge provider (MYCOOLPAY) |
| GET     | `/api/payments/wallets/{walletId}/recharge-orders`        | historique recharges          |
| GET     | `/api/payments/wallets/recharge-orders/{orderId}`         | détail recharge               |
| POST    | `/api/payments/wallets/recharge-orders/{orderId}/refresh` | rafraîchir + créditer wallet  |
| POST    | `/api/payments/wallets/{walletId}/pay`                    | pay                           |
| GET     | `/api/payments/wallets/{walletId}/transactions`           | listTransactions              |
| GET     | `/api/payments/wallets/{walletId}/can-operate?amount=`    | canOperate                    |
| GET     | `/api/payments/orders`                                    | history                       |
| POST    | `/api/payments/orders`                                    | initiate                      |
| GET     | `/api/payments/orders/{id}`                               | get                           |
| POST    | `/api/payments/orders/{id}/refresh`                       | refresh                       |

## Endpoints BFF - service bundles

| Méthode | Route                                           | Opération                            |
| ------- | ----------------------------------------------- | ------------------------------------ |
| GET     | `/api/service-pricing`                          | catalogue prix serveur               |
| POST    | `/api/service-bundles/quote`                    | devis (montant calculé serveur)      |
| POST    | `/api/service-bundles/checkout`                 | lancer checkout MYCOOLPAY/STRIPE     |
| GET     | `/api/service-bundles/orders`                   | historique bundles                   |
| GET     | `/api/service-bundles/orders/{orderId}`         | détail commande bundle               |
| POST    | `/api/service-bundles/orders/{orderId}/refresh` | rafraîchir statut + activer services |

Le checkout bundle injecte côté BFF : `clientId`, `payerReference`, `organizationId` (cookie).

## Endpoints BFF - commercial plans

| Méthode | Route                                            | Opération                               |
| ------- | ------------------------------------------------ | --------------------------------------- |
| POST    | `/api/commercial-plans/{planCode}/quote`         | devis plan commercial (montant serveur) |
| POST    | `/api/commercial-plans/{planCode}/checkout`      | lancer checkout MYCOOLPAY/STRIPE        |
| GET     | `/api/commercial-plans/orders`                   | historique commandes plans              |
| GET     | `/api/commercial-plans/orders/{orderId}`         | détail commande plan                    |
| POST    | `/api/commercial-plans/orders/{orderId}/refresh` | rafraîchir statut + activer plan        |

Le checkout plan commercial injecte côté BFF : `clientId`, `payerReference`, `organizationId` (cookie).

La recharge wallet injecte côté BFF : `clientId`, `payerReference`, `currency` (défaut `XAF`).

**Non exposé :** `POST /api/payments/orders/callbacks/{provider}` - webhooks → backend IWM direct.

## Endpoints BFF - auth (sélection)

| Méthode | Route                         | Comportement BFF                        |
| ------- | ----------------------------- | --------------------------------------- |
| POST    | `/api/auth/login`             | Proxy → retourne `mfaToken`             |
| POST    | `/api/auth/login/mfa/confirm` | Proxy → **Set-Cookie** access token     |
| POST    | `/api/auth/discover-contexts` | Proxy standard                          |
| POST    | `/api/auth/select-context`    | Proxy → **Set-Cookie** `organizationId` |
| GET     | `/api/auth/me/memberships`    | Liste des appartenances (cookie auth)     |
| POST    | `/api/auth/logout`            | Proxy → **clear** cookies session       |
| GET     | `/api/users/me`               | Proxy avec cookie auth                  |

## Structure des pages

```
src/app/
  (public)/
    page.tsx              # Landing YowYob Payment
    login/page.tsx        # Wizard auth MFA
  (protected)/
    layout.tsx            # Layout protégé
    organizations/page.tsx
    console/page.tsx
src/components/
  layout/                 # SiteHeader, ConsoleHeader
  auth/                   # Formulaires login (inline dans pages)
  console/                # WalletCard, TransactionList, PlansGrid
  cart/                   # CartSheet
  ui/                     # Composants shadcn-style
src/stores/
  cart-store.ts           # Panier Zustand (plans)
  auth-wizard-store.ts    # Credentials temporaires org picker
src/lib/
  session-cookies.ts      # Gestion cookies httpOnly
  bff-client.ts           # fetch BFF credentials include
```

## Design system

| Token       | Valeur    | Usage                  |
| ----------- | --------- | ---------------------- |
| `primary`   | `#1b4df5` | CTA, boutons           |
| `secondary` | `#48546b` | Texte secondaire       |
| `white`     | `#ffffff` | Fond cartes            |
| `navy`      | `#0f172a` | Titres, onglets actifs |
| `surface`   | `#f8fafc` | Fond page              |

- **Police :** Plus Jakarta Sans
- **Icônes :** lucide-react
- **UI :** composants shadcn-style (Radix + CVA)
- **Tailwind v4 :** préfixe `yypay:` sur toutes les classes utilitaires

## Mise à jour OpenAPI

1. Remplacer `openapi/openapi-payment.json` et/ou `openapi/openapi-auth.json`
2. Exécuter `npm run generate:api`
3. Vérifier les routes BFF
4. Committer les fichiers `src/types/schemas-*.d.ts`
