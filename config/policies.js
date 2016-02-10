/**
 * Policy Mappings
 * (sails.config.policies)
 *
 * Policies are simple functions which run **before** your controllers.
 * You can apply one or more policies to a given controller, or protect
 * its actions individually.
 *
 * Any policy file (e.g. `api/policies/authenticated.js`) can be accessed
 * below by its filename, minus the extension, (e.g. "authenticated")
 *
 * For more information on configuring policies, check out:
 * http://sailsjs.org/#!documentation/
 */


module.exports.policies = {

  // Default policy for all controllers and actions
  // (`true` allows public access)
  '*': true,
  MessageController: {
    '*' : ['sessionAuth', 'clientToken']
  },
  ChatController: {
    '*' : ['sessionAuth', 'clientToken']
  },
  NotifyController: {
    '*' : ['sessionAuth', 'clientToken']
  },
  GenreController: {
    '*' : ['clientToken']
  },
  TagController: {
    '*' : ['sessionAuth', 'clientToken']
  },
  SearchController: {
    '*' : ['clientToken']
  },
  PlaylistController: {
    '*' : ['sessionAuth', 'clientToken'],
    find: ['clientToken'],
    findAll: ['clientToken'],
    findUserSets: ['clientToken']
  },
  TrackController: {
    '*' : ['clientToken'],
    id3genres: true,
    widget: true,
    view: true,
    test: true,
    like: ['sessionAuth', 'clientToken'],
    comment: ['sessionAuth', 'clientToken'],
    create: ['sessionAuth', 'clientToken'],
    update: ['sessionAuth', 'clientToken'],
    destroy: ['sessionAuth', 'clientToken'],
    cover: ['sessionAuth', 'clientToken']
  },
  UserController: {
    '*' : true,
    logout: ['sessionAuth'],
    find: ['clientToken'],
    stats: ['clientToken'],
    findAll: ['clientToken'],
    findPopular: ['clientToken'],
    findRecommended: ['clientToken'],
    findFollows: ['clientToken'],
    findFollowers: ['clientToken'],
    verify: ['sessionAuth', 'clientToken'],
    update: ['sessionAuth', 'clientToken'],
    findChatters: ['sessionAuth', 'clientToken'],
    follow: ['sessionAuth', 'clientToken'],
    subscribe: ['sessionAuth', 'clientToken'],
    cover: ['sessionAuth', 'clientToken']
  },

	// Here's an example of mapping some policies to run before
  // a controller and its actions
	// RabbitController: {

		// Apply the `false` policy as the default for all of RabbitController's actions
		// (`false` prevents all access, which ensures that nothing bad happens to our rabbits)
		// '*': false,

		// For the action `nurture`, apply the 'isRabbitMother' policy
		// (this overrides `false` above)
		// nurture	: 'isRabbitMother',

		// Apply the `isNiceToAnimals` AND `hasRabbitFood` policies
		// before letting any users feed our rabbits
		// feed : ['isNiceToAnimals', 'hasRabbitFood']
	// }
};
