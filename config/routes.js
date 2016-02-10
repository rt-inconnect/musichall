/**
 * Route Mappings
 * (sails.config.routes)
 *
 * Your routes map URLs to views and controllers.
 *
 * If Sails receives a URL that doesn't match any of the routes below,
 * it will check for matching files (images, scripts, stylesheets, etc.)
 * in your assets directory.  e.g. `http://localhost:1337/images/foo.jpg`
 * might match an image file: `/assets/images/foo.jpg`
 *
 * Finally, if those don't match either, the default 404 handler is triggered.
 * See `config/404.js` to adjust your app's 404 logic.
 *
 * Note: Sails doesn't ACTUALLY serve stuff from `assets`-- the default Gruntfile in Sails copies
 * flat files from `assets` to `.tmp/public`.  This allows you to do things like compile LESS or
 * CoffeeScript for the front-end.
 *
 * For more information on routes, check out:
 * http://links.sailsjs.org/docs/config/routes
 */

module.exports.routes = {


  // Make the view located at `views/homepage.ejs` (or `views/homepage.jade`, etc. depending on your
  // default view engine) your home page.
  //
  // (Alternatively, remove this and add an `index.html` file in your `assets` directory)
  '/': { view: 'homepage' },
  
  'get /w/:id' : 'TrackController.widget',
  'get /track/:id/comments' : 'TrackController.view',
  'get /api/track/test' : 'TrackController.test',
  'get /api/track/all' : 'TrackController.findAll',
  'get /api/track/added' : 'TrackController.findAdded',
  'get /api/track/likes' : 'TrackController.findLikes',
  'get /api/track/stream' : 'TrackController.stream',
  'get /api/track/search' : 'TrackController.search',
  'get /api/track/popular' : 'TrackController.findPopular',
  'get /api/track/history' : 'TrackController.history',
  'get /api/track/recommended' : 'TrackController.findRecommended',
  'get /api/track/same/:id' : 'TrackController.findSame',
  'post /api/track/cover/:id' : 'TrackController.cover',
  'get /api/track/download/:id' : 'FileController.mp3',
  'delete /api/track/:id' : 'TrackController.destroy',
  'get /api/track/welcome' : 'TrackController.welcome',
  'get /api/track/:id' : 'TrackController.find',
  'get /api/track/:id/comments' : 'TrackController.comments',
  'get /api/track/:id/likes' : 'TrackController.likes',
  'get /api/track/:id/playlists' : 'TrackController.playlists',
  'put /api/track/start/:id' : 'TrackController.playStarted',
  'put /api/track/end/:id' : 'TrackController.playEnded',

  'get /api/user/verify' : 'UserController.verify',
  'get /api/user/followers' : 'UserController.findFollowers',
  'get /api/user/follows' : 'UserController.findFollows',
  'post /api/user' : 'UserController.update',
  'post /api/user/cover' : 'UserController.cover',
  'get /api/users' : 'UserController.findAll',
  'get /api/user/recommended' : 'UserController.findRecommended',
  'get /api/user/popular' : 'UserController.findPopular',
  'get /api/user/stats' : 'UserController.stats',

  'get /api/playlist' : 'PlaylistController.findAll',
  'get /api/playlist/download/:id' : 'FileController.playlist',
  'get /api/playlist/track/:id' : 'PlaylistController.findUserSets',
  'get /api/playlist/track' : 'PlaylistController.track',
  'delete /api/playlist/:id' : 'PlaylistController.destroy',
  'get /api/playlist/:id' : 'PlaylistController.find',
  'put /api/playlist/:id' : 'PlaylistController.update',

  'get /users/*/resized.*' : 'FileController.get',
  'get /users/*/avatar.*' : 'FileController.get',
  'get /users/*/tracks/*/converted.ogg' : 'FileController.ogg',
  'get /users/*/tracks/*/images/*' : 'FileController.get',
  'get /users/*/playlists/*' : 'FileController.get',

  'get /api/genres/id3genres' : 'TrackController.id3genres',
  'get /api/genre' : 'GenreController.findAll',
  'get /api/genre/search' : 'GenreController.search',
  'get /api/genre/:id' : 'GenreController.find',
  'get /api/notify' : 'NotifyController.findAll',
  'get /api/notify/unreaded' : 'NotifyController.findUnreaded',
  'get /api/notify/mark' : 'NotifyController.mark',

  // Custom routes here...


  // If a request to a URL doesn't match any of the custom routes above,
  // it is matched against Sails route blueprints.  See `config/blueprints.js`
  // for configuration options and examples.

};
