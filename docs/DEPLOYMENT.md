# Despliegue en VPS

## Prerrequisitos

- Acceso SSH, Docker Compose y registro DNS de `billing.globalautomate.co` apuntando al VPS.
- Nginx existente inspeccionado y respaldado.
- Secretos de `.env` entregados por canal seguro.

## Procedimiento

1. Clonar en `/opt/global-billing`, copiar `.env.production.example` a `.env` y reemplazar todos los secretos.
2. `docker compose up --build -d`.
3. Crear cada administrador con `docker compose exec backend python manage.py bootstrap_admin`, cambiando variables entre ejecuciones.
4. Añadir solo el server block de `deploy/nginx/` al Nginx existente y ejecutar `nginx -t`.
5. Obtener TLS: `certbot --nginx -d billing.globalautomate.co`.
6. Verificar `/api/health/`, login, TOTP, jobs, documento y backup. Nginx debe conservar `X-Forwarded-Proto`; Django lo usa para reconocer HTTPS detrás del proxy.
7. Activar cron del backup y ensayar restauración aislada.

No activar HSTS hasta confirmar HTTPS. Django habilita cookies Secure, HSTS y redirección SSL con `DEBUG=false`.

Nginx debe enviar `/api/` directamente a Django en `127.0.0.1:8000` y el
resto de rutas a Next.js en `127.0.0.1:3000`. No se debe encadenar
Nginx -> Next.js -> Django para la API: el salto interno HTTP combinado con
`SECURE_SSL_REDIRECT=true` genera una redirección hacia la misma URL HTTPS.

Next conserva los slash finales de DRF mediante `skipTrailingSlashRedirect`. No retirarlo: Next y Django aplicarían normalizaciones opuestas y generarían un bucle 308/301 en `/api/*`.

La refracción avanzada de `liquid-glass-react` queda desactivada por defecto en producción (`NEXT_PUBLIC_ADVANCED_GLASS=false`). El fallback mantiene glass, blur, bordes y profundidad sin alterar el tamaño de paneles financieros.

## Actualización

```bash
git pull --ff-only
docker compose build
docker compose up -d
docker compose exec backend python manage.py migrate --noinput
```

Revisar `docker compose ps` y logs. El deploy automático no está habilitado.
