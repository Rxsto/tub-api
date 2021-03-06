const fs = require('fs');
const Fastify = require('fastify');
const TokenGenerator = require('./utils/TokenGenerator');
const TokenVerificator = require('./utils/TokenVerificator');
const SnowflakeGenerator = require('./utils/SnowflakeGenerator');
const Cache = require('./cache/Cache');

class API {

  constructor() {
    this.app = new Fastify({
      logger: {
        prettyPrint: {
          translateTime: 'dd.mm.yy HH:MM:ss',
          errorLikeObjectKeys: ['err', 'error'],
          ignore: 'pid,hostname'
        },
        level: process.env.LOG_LEVEL
      }
    });
    this.tokenGenerator = new TokenGenerator(this);
    this.tokenVerificator = new TokenVerificator(this);
    this.snowflakeGenerator = new SnowflakeGenerator(this);
    this.userCache = new Cache(this);
    this.imageCache = new Cache(this);
    this.exhibitionCache = new Cache(this);
  }

  async initialize() {
    this.app.log.info('Initializing tub API...');

    this.app.register(require('./io/Database'));
    this.app.register(require('fastify-cors'), { origin: true });
    this.app.register(require('fastify-file-upload'), { limits: { fileSize: 5 * 1024 * 1024 * 1024}});
    
    await fs.readdir('./src/routes/', async (error, routes) => {
      if (error) throw error;
  
      routes.forEach(route => {
        this.app.register(require(`./routes/${route}`), { API: this });
      });
    });

    await this.launch();

    this.userCache.initialize(this.app.database.db('tub').collection('users'));
    this.imageCache.initialize(this.app.database.db('tub').collection('images'));
    this.exhibitionCache.initialize(this.app.database.db('tub').collection('exhibitions'));
  }

  async launch() {
    await this.app.listen(process.env.APP_PORT, process.env.APP_HOST).catch(err => {
      this.app.log.error(err);
      process.exit(1);
    });
  }
}

module.exports = API;
