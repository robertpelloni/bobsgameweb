module.exports = {
  apps: [
    {
      name: 'bobsgameweb-server',
      script: './index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        HOST: '0.0.0.0',
        PORT: '6065',
        ALLOWED_ORIGIN: 'https://bobsgame.com'
      }
    }
  ]
};
