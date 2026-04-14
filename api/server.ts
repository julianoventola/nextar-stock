import jsonServer from 'json-server';
import path from 'path';

const server = jsonServer.create();
// IMPORTANT: Use the path to your db.json
const router = jsonServer.router(path.join(__dirname, '../db.json'));
const middlewares = jsonServer.defaults();

server.use(middlewares);
// Optional: Rewrite routes if your frontend expects /api/something
server.use(jsonServer.rewriter({
  '/api/*': '/$1'
}));
server.use(router);

export default server;
