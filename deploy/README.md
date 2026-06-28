# Docker deployment without Nginx

This setup runs built artifacts only:

- `server`: `apps/server/dist/index.mjs`
- `worker`: `apps/worker/dist/index.mjs`
- `web`: one image containing built Vite `dist` for `admin`, `employer`, and `candidate`, served by `deploy/static-server.mjs`
- `postgres` and `redis`: official images

## VPS first-time setup

```bash
sudo apt update
sudo apt install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
```

Log out and SSH in again after adding the Docker group.

For a 4 GB RAM VPS, add swap:

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## Configure

```bash
cp deploy/.env.prod.example deploy/.env.prod
```

Edit `deploy/.env.prod`:

- Replace `127.0.0.1` with the VPS IP.
- Set `POSTGRES_PASSWORD` to a real password. The compose file derives the app `DATABASE_URL` from `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`.
- Set a real `BETTER_AUTH_SECRET` with at least 32 characters.
- Keep `SEED_DEMO_USERS=true` for the report/demo accounts.

## Build and run

```bash
docker compose --env-file deploy/.env.prod -f deploy/compose.prod.yml up -d --build
```

Open:

- Candidate: `http://<vps-ip>:3003`
- Employer: `http://<vps-ip>:3002`
- Admin: `http://<vps-ip>:3001`
- API health: `http://<vps-ip>:3000/`

## Operate

```bash
docker compose --env-file deploy/.env.prod -f deploy/compose.prod.yml ps
docker compose --env-file deploy/.env.prod -f deploy/compose.prod.yml logs -f server
docker compose --env-file deploy/.env.prod -f deploy/compose.prod.yml logs -f worker
docker compose --env-file deploy/.env.prod -f deploy/compose.prod.yml logs -f web
docker system df
docker system prune -af
```

Do not prune volumes unless you intentionally want to delete PostgreSQL/Redis data.
