import { bucket, defineRailway, postgres, preserve, project, redis, service, volume } from "railway/iac";

export default defineRailway(() => {
  const Postgres = postgres("Postgres", { region: "us-west2" });
  Postgres.networking = { privateNetworkEndpoint: "postgres" };
  const Redis = redis("Redis", { region: "us-west2" });
  Redis.deploy = { startCommand: "/bin/sh -c \"rm -rf $RAILWAY_VOLUME_MOUNT_PATH/lost+found/ && exec docker-entrypoint.sh redis-server --requirepass $REDIS_PASSWORD --save 60 1 --dir $RAILWAY_VOLUME_MOUNT_PATH\"" };
  Redis.networking = { privateNetworkEndpoint: "redis" };
  const redisVolume = volume("redis-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "us-west2", sizeMB: 50000 });
  const postgresVolume = volume("postgres-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "us-west2", sizeMB: 50000 });
  const PostgresPITR = bucket("Postgres-PITR", { region: "sjc" });
  const frontend = service("frontend", {
    replicas: { "us-west2": 1 },
    domains: ["admin.bobololadono.uz", "app.bobololadono.uz", "bobololadono.uz", "www.bobololadono.uz"],
    env: { GIT_COMMIT_SHA: preserve(), NEXT_PUBLIC_API_URL: preserve(), NODE_ENV: preserve() },
  });
  const backend = service("backend", {
    healthcheck: "/health/ready",
    healthcheckTimeout: 120,
    replicas: { "us-west2": 1 },
    domains: ["api.bobololadono.uz"],
    source: { rootDirectory: "/backend" },
    env: { CORS_ORIGINS: preserve(), DATABASE_MIGRATION_URL: preserve(), DATABASE_URL: preserve(), DB_APP_ROLE: preserve(), DB_ROLE_ASSERTION: preserve(), DEV_EXPOSE_OTP: preserve(), GIT_COMMIT_SHA: preserve(), JWT_ACCESS_SECRET: preserve(), JWT_STAFF_ACCESS_SECRET: preserve(), NODE_ENV: preserve(), PAYMENTS_ENABLED: preserve(), PAYOUTS_ENABLED: preserve(), REDIS_URL: preserve(), SMS_PROVIDER: preserve(), STAFF_CORS_ORIGINS: preserve(), STAFF_TOTP_ENCRYPTION_KEY: preserve(), SWAGGER_ENABLED: preserve(), TEXTUP_AUTH_URL: preserve(), TEXTUP_EMAIL: preserve(), TEXTUP_PASSWORD: preserve(), TEXTUP_PASSWORD_RESET_TEMPLATE_ID: preserve(), TEXTUP_REGISTRATION_TEMPLATE_ID: preserve(), TEXTUP_SMS_URL: preserve(), TRUST_PROXY: preserve() },
  });
  const BoboDoda = service("Bobo-Doda", {
    healthcheck: "/",
    healthcheckTimeout: 120,
  });

  return project("Bobo-Doda", {
    resources: [frontend, Postgres, Redis, backend, redisVolume, postgresVolume, PostgresPITR, BoboDoda],
  });
});
