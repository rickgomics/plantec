module.exports = {
  apps: [
    {
      // Variante servida atrás do NPM em /plantecia/bom-builder — build
      // próprio (basePath/distDir embutidos em tempo de build). A instância
      // principal (porta 3000 / Docker) não é gerenciada por este arquivo.
      name: "bom-builder-plantecia",
      cwd: __dirname,
      script: "node_modules/.bin/next",
      args: "start -p 3011",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: "production",
        NEXT_BASE_PATH: "/plantecia/bom-builder",
        NEXT_PUBLIC_BASE_PATH: "/plantecia/bom-builder",
        NEXT_DIST_DIR: ".next-plantecia",
      },
    },
  ],
};
