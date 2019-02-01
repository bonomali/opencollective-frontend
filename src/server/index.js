import '../env';

import path from 'path';
import http from 'http';
import express from 'express';
import next from 'next';
import accepts from 'accepts';
import cloudflareIps from 'cloudflare-ip/ips.json';

import routes from './routes';
import { loggerMiddleware, logger } from './logger';
import { getLocaleDataScript, getMessages, languages } from './intl';

const server = express();

server.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal'].concat(cloudflareIps));

const env = process.env.NODE_ENV;
const dev = env === 'development' || env === 'docker';

const app = next({ dev, dir: path.dirname(__dirname) });
server.next = app;

const port = process.env.PORT;

app.prepare().then(() => {
  server.use(loggerMiddleware.logger);

  server.use((req, res, next) => {
    const accept = accepts(req);
    const locale = accept.language(languages) || 'en';
    logger.debug('url %s locale %s', req.url, locale);
    req.locale = locale;
    req.localeDataScript = getLocaleDataScript(locale);
    req.messages = getMessages(locale);
    // req.messages = dev ? {} : getMessages(locale)
    next();
  });

  server.use(routes(server, app));
  server.use(loggerMiddleware.errorLogger);

  const httpServer = http.createServer(server);

  httpServer.on('error', err => {
    logger.error(`Can't start server on http://localhost:${port} in ${env} environment. %s`, err);
  });

  httpServer.listen(port, () => {
    logger.info(`Ready on http://localhost:${port} in ${env} environment`);
  });
});
