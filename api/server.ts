import { create, router, defaults, rewriter } from "json-server";
const server = create();
const database = router('db.json');
const middlewares = defaults();

server.use(middlewares);
server.use(rewriter({ '/api/*': '/$1' })); // Redirects /api/posts to /posts
server.use(database);

export default server