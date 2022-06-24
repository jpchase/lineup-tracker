export default {
  port: 8080,
  nodeResolve: true,
  appIndex: 'src/local.index.html',
  middleware: [
    function rewriteIndex(context, next) {
      if (context.url === '/' || context.url === '/index.html') {
        context.url = '/src/local.index.html';
      }
      return next();
    },
  ],
};
