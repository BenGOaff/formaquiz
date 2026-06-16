# FormaQuiz : déploiement sur le VPS (pas à pas)

Ton serveur héberge déjà Tipote (port 3000), Tiquiz (port 3001) et le
serveur vidéo tus (1080), tous derrière Caddy. FormaQuiz se branche à
côté sur le **port 3002**, process pm2 `formaquiz-prod`. À chaque étape,
le repère est : "fais comme pour quiz.tipote.com".

Ordre conseillé : Supabase -> Cloudflare (DNS) -> code sur GitHub ->
VPS (build + pm2) -> Caddy -> test.

---

## 1. Supabase (la base de données)

Sans ça, le site s'affiche mais ne montre aucun contenu.
1. Crée un NOUVEAU projet Supabase (séparé de Tiquiz/Tipote).
2. SQL Editor -> colle `supabase/migrations/0001_formaquiz_initial.sql` -> Run.
3. SQL Editor -> colle `supabase/seed/day1.sql` -> Run.
4. Authentication -> URL Configuration :
   - Site URL : `https://formaquiz.tipote.com`
   - Redirect URLs : ajoute `https://formaquiz.tipote.com/auth/callback`
5. Note tes 3 clés (Settings > API) : Project URL, anon, service_role.

---

## 2. Cloudflare (le sous-domaine)

1. Cloudflare -> zone `tipote.com` -> DNS -> Add record.
2. Type `A`, Name `formaquiz`, IPv4 = **la même IP que l'enregistrement
   `quiz`** (copie la valeur de la ligne `quiz`).
3. Proxy status (nuage orange/gris) : **mets le MÊME réglage que la ligne
   `quiz.tipote.com`**. Important pour que le certificat HTTPS de Caddy
   se génère comme pour Tiquiz.
4. Sauvegarde. La propagation prend de quelques secondes à quelques minutes.

---

## 3. Envoyer le code sur GitHub (depuis ton PC)

FormaQuiz est un repo séparé : `BenGOaff/formaquiz`. Mon code est sur la
branche `claude/laughing-gauss-qh8sua`. Même logique que ton workflow
Tiquiz : on applique mes fichiers sur `main` sans changer de branche.

```powershell
# Sur ton PC, dans ton dossier formaquiz (clone-le d'abord s'il n'existe pas :
#   git clone https://github.com/BenGOaff/formaquiz.git )
cd C:\Users\hello\Desktop\formaquiz   # adapte le chemin
git fetch origin
git checkout main
git pull origin main
git checkout origin/claude/laughing-gauss-qh8sua -- .
git add .
git commit -m "formaquiz: socle espace formation + admin"
git push origin main
```

---

## 4. Sur le VPS (build + lancement)

```bash
# Connecte-toi en SSH au VPS, puis :
cd /home/tipote
git clone https://github.com/BenGOaff/formaquiz.git formaquiz
cd formaquiz

# Crée le fichier .env (nano, puis colle, Ctrl+O pour sauver, Ctrl+X pour quitter)
nano .env
```

Contenu minimal du `.env` (remplis avec tes valeurs Supabase) :
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxx
SUPABASE_SERVICE_ROLE_KEY=xxxx
NEXT_PUBLIC_APP_URL=https://formaquiz.tipote.com
PORT=3002
# Webhook Systeme.io (tu peux remplir plus tard)
SYSTEME_IO_WEBHOOK_SECRET=
```

Puis build et démarrage :
```bash
npm ci
npm run build
pm2 start npm --name formaquiz-prod -- start
pm2 save
pm2 logs formaquiz-prod --lines 20 --nostream   # doit montrer "Ready on ... :3002"
```

> Plus tard, pour déployer une mise à jour :
> ```bash
> cd /home/tipote/formaquiz
> git pull origin main
> npm ci
> npm run build
> pm2 restart formaquiz-prod   # vise bien formaquiz, pas tiquiz
> ```
> Le port 3002 est fixé dans le start script (`next start -p 3002`),
> donc pas besoin de `--update-env`.

---

## 5. Caddy (router le sous-domaine vers l'app)

Ouvre ton Caddyfile (`/etc/caddy/Caddyfile`) et ajoute ce bloc, juste
après le bloc `quiz.tipote.com` (il réutilise tes snippets existants) :

```
# ------------------------------------------------------------------
# FormaQuiz (formaquiz.tipote.com)
# ------------------------------------------------------------------
formaquiz.tipote.com {
        encode zstd gzip
        import block_bad_paths

        reverse_proxy 127.0.0.1:3002 {
                import proxy_headers
                transport http {
                        read_timeout 5m
                }
        }
}
```

Recharge Caddy (sans coupure) :
```bash
sudo systemctl reload caddy
# ou, selon ton install : sudo caddy reload --config /etc/caddy/Caddyfile
```

Au premier accès HTTPS, Caddy génère le certificat tout seul (laisse-lui
~30 secondes).

---

## 6. Test de bout en bout

1. Va sur `https://formaquiz.tipote.com/login`.
2. Entre ton email, clique "Recevoir un lien de connexion", connecte-toi.
3. Donne-toi l'accès (Supabase SQL Editor) :
   ```sql
   insert into enrollments (user_id, status, source)
   select id, 'active', 'manual' from auth.users where email = 'blagardette@gmail.com'
   on conflict (user_id) do update set status = 'active', revoked_at = null;
   ```
4. Recharge : le Jour 1 apparaît. Le back-office est sur
   `https://formaquiz.tipote.com/admin`.

---

## Récap des ports / process sur ton VPS

| Service       | Port  | Process pm2     |
|---------------|-------|-----------------|
| Tipote        | 3000  | tipote-prod     |
| Tiquiz        | 3001  | tiquiz-prod     |
| **FormaQuiz** | 3002  | formaquiz-prod  |
| tus (vidéo)   | 1080  | popquiz-tus     |

Si une étape coince, copie-moi le message d'erreur exact, on débloque
ensemble.
