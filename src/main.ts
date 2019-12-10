import express from 'express';
import http from 'http';
import morgan from 'morgan';
import { config, debug } from './config';
import { router } from './router';
import { Context } from './context';
import { setupRepository } from './addon';

const ensureRepository = () => {
  if (!config.repository) setupRepository();
};

export function startServer(port = null) {
  ensureRepository();

  const app = express();
  app.use(morgan('dev'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use('/', router);

  const server = http.createServer(app);

  function onListening() {
    const addr = server.address();
    const bind =
      typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`;
    debug(`Listening on ${bind}`);
  }

  server.listen(port ?? parseInt(process.env.PORT || 3000));
  server.on('listening', onListening);

  return { server, app };
}

export function startCli(args) {
  ensureRepository();

  const request = {};
  for (const arg of args) {
    const m = /^(.*?)=(.*)$/.exec(arg);
    const key = m[1];
    try {
      request[key] = JSON.parse(m[2]);
    } catch (error) {
      request[key] = m[2];
    }
  }
  const ctx = new Context(
    request.addonId ?? 'repository',
    request.action ?? 'infos',
  );
  ctx
    .run(request)
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch(error => {
      console.error(error);
      throw error;
    });
}

export function start() {
  const args = [...process.argv];
  args.splice(0, 2);
  if (args[0] === 'call') {
    args.splice(0, 1);
    startCli(args);
  } else {
    startServer();
  }
}
