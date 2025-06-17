const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Job Matching Platform API',
      version: '1.0.0',
      description: 'API documentation for the AI-Enhanced Job Matching Platform.',
    },
    servers: [
      {
        url: 'http://localhost:5001', // Your server URL
        description: 'Development server',
      },
    ],
    // This part is crucial for defining security (JWT)
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  // Path to the API docs. We will write these in our route files.
  apis: ['./routes/*.js'], 
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;