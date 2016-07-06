#!/usr/bin/env node

const finalhandler = require('finalhandler');
const fs = require('fs');
const http2 = require('http2');
const morgan = require('morgan');
const path = require('path');
const serveStatic = require('serve-static');
const https = require('https');

const defaults = {
  port: 8081,
  www: path.join(__dirname, '../../src'),
  certsDir: path.join(__dirname, '../certs')
};
const www = process.argv.slice(2).pop() || defaults.www;
const port = process.env.npm_package_config_port || defaults.port;
const certsDir = process.env.npm_package_config_certs_dir || defaults.certsDir;
const cert = fs.readFileSync(path.join(certsDir, 'localhost.cert'));
const key = fs.readFileSync(path.join(certsDir, 'localhost.key'));

const logger = morgan('dev');
const serve = serveStatic(www, {index: ['index.html']});
const proxy = (req, resp, next) => {
  const url = req.url.replace(/\/+/, '/');
  const meth = req.method;

  if (meth !== 'GET' || !url.startsWith('/proxy/')) {
    return next();
  }

  const remote = `https://${url.slice(7)}`;

  https.get(remote, proxyResp => {
    const allowedHeaders = new Set(['date', 'content-type', 'content-length', 'vary']);

    resp.writeHead(proxyResp.statusCode, Object.keys(proxyResp.headers).reduce((headers, k) => {
      if (allowedHeaders.has(k)) {
        headers[k] = proxyResp.headers[k];
      }

      return headers;
    }, {}));

    proxyResp.on('data', chunk => {
      resp.write(chunk, 'bimary');
    });

    proxyResp.on('end', () => {
      resp.end();
    });
  });
};
const use = (req, resp, middlewares) => {
  middlewares.reverse().reduce((next, handler) => {
    return err => {
      if (err) {
        next(err);
      }

      handler(req, resp, next);
    };
  }, finalhandler(req, resp))();
};

const server = http2.createServer({key, cert}, (req, resp) => use(req, resp, [logger, proxy, serve]));

server.listen(port, () => console.log(
  `Dev server listening on https://localhost:${port} (don't forget to use "HTTPS")`
));
